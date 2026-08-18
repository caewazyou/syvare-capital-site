document.addEventListener("DOMContentLoaded", function () {

  "use strict";


  /* =========================================================
     SYVARÉ CAPITAL — MARKETS.JS
     OPTIMISED PRODUCTION VERSION

     FEATURES
     ---------------------------------------------------------
     • Equities
     • FX
     • UK Bank Rate
     • US Treasury yields
     • Frontend caching
     • Range caching
     • Reverse FX caching
     • Request cancellation
     • Duplicate-request protection
     • Flat-rate chart handling
     • Responsive X-axis formatting
     • Background refresh
     • Stale-cache fallback
  ========================================================= */


  /* =========================================================
     CONFIGURATION
  ========================================================= */

  const MARKET_API_BASE =
    "https://syvare-market-api.coelhoay.workers.dev";


  /*
     Frontend cache lifetime.

     Five minutes matches the API/Worker cache.
  */

  const CACHE_TTL =
    5 * 60 * 1000;


  const marketCache =
    new Map();


  /*
     Stores network requests currently in progress.

     Unlike the previous implementation,
     pending requests are stored with their controller
     so cancellation and deduplication remain predictable.
  */

  const pendingRequests =
    new Map();


  /* =========================================================
     ELEMENTS
  ========================================================= */

  const canvas =
    document.getElementById("market-chart");


  if (!canvas) {
    return;
  }


  const tabs =
    document.querySelectorAll("[data-market-tab]");


  const panels =
    document.querySelectorAll("[data-market-panel]");


  const periodButtons =
    document.querySelectorAll("[data-period]");


  const equityButtons =
    document.querySelectorAll("[data-equity]");


  const rateButtons =
    document.querySelectorAll("[data-rate]");


  const title =
    document.getElementById("market-title");


  const region =
    document.getElementById("market-region");


  const valueElement =
    document.getElementById("market-value");


  const movementElement =
    document.getElementById("market-movement");


  const loading =
    document.getElementById("market-loading");


  const errorElement =
    document.getElementById("market-error");


  const sourceElement =
    document.getElementById("market-source");


  const updatedElement =
    document.getElementById("market-updated");


  const customPeriod =
    document.getElementById("custom-market-period");


  const fromMonth =
    document.getElementById("market-from-month");


  const fromYear =
    document.getElementById("market-from-year");


  const toMonth =
    document.getElementById("market-to-month");


  const toYear =
    document.getElementById("market-to-year");


  const applyPeriod =
    document.getElementById("market-apply-period");


  const fxBase =
    document.getElementById("fx-base");


  const fxQuote =
    document.getElementById("fx-quote");


  const fxSwap =
    document.getElementById("fx-swap");


  /* =========================================================
     STATE
  ========================================================= */

  let chart =
    null;


  let activeTab =
    "equities";


  let activeEquity =
    "ftse100";


  let activeRate =
    "uk-bank-rate";


  let selectedPeriod =
    "1Y";


  let requestCounter =
    0;


  let activeController =
    null;


  /* =========================================================
     CURRENCIES
  ========================================================= */

  const currencies = [

    "GBP",
    "USD",
    "EUR",
    "INR",
    "JPY",
    "CHF",
    "CAD",
    "AUD",
    "NZD",
    "SGD",
    "HKD",
    "CNY",
    "AED",
    "SAR",
    "NOK",
    "SEK",
    "DKK",
    "PLN",
    "CZK",
    "HUF",
    "ZAR",
    "BRL",
    "MXN",
    "KRW"

  ];


  if (
    fxBase &&
    fxQuote
  ) {

    currencies.forEach(
      function (currency) {

        const baseOption =
          document.createElement(
            "option"
          );


        baseOption.value =
          currency;


        baseOption.textContent =
          currency;


        const quoteOption =
          baseOption.cloneNode(
            true
          );


        fxBase.appendChild(
          baseOption
        );


        fxQuote.appendChild(
          quoteOption
        );

      }
    );


    fxBase.value =
      "GBP";


    fxQuote.value =
      "USD";
  }


  /* =========================================================
     DATE SELECTORS
  ========================================================= */

  const months = [

    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"

  ];


  if (
    fromMonth &&
    toMonth
  ) {

    months.forEach(
      function (
        month,
        index
      ) {

        [
          fromMonth,
          toMonth
        ].forEach(
          function (
            select
          ) {

            const option =
              document.createElement(
                "option"
              );


            option.value =
              String(
                index + 1
              ).padStart(
                2,
                "0"
              );


            option.textContent =
              month;


            select.appendChild(
              option
            );

          }
        );

      }
    );

  }


  const currentYear =
    new Date()
      .getFullYear();


  if (
    fromYear &&
    toYear
  ) {

    for (
      let year = currentYear;
      year >= 1948;
      year -= 1
    ) {

      [
        fromYear,
        toYear
      ].forEach(
        function (
          select
        ) {

          const option =
            document.createElement(
              "option"
            );


          option.value =
            String(year);


          option.textContent =
            String(year);


          select.appendChild(
            option
          );

        }
      );

    }

  }


  /* =========================================================
     DATE HELPERS
  ========================================================= */

  function formatDate(
    date
  ) {

    return (

      date.getFullYear() +

      "-" +

      String(
        date.getMonth() + 1
      ).padStart(
        2,
        "0"
      ) +

      "-" +

      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      )

    );
  }


  function getMaximumStartDate() {

    /*
       Bank of England official Bank Rate history:
       20 January 1975 onwards.

       U.S. Treasury:
       1990 onwards.

       Equities / FX:
       generic frontend boundary = 1948.
    */

    if (
      activeTab === "rates" &&
      activeRate === "uk-bank-rate"
    ) {

      return new Date(
        1975,
        0,
        20
      );
    }


    if (
      activeTab === "rates"
    ) {

      return new Date(
        1990,
        0,
        1
      );
    }


    return new Date(
      1948,
      0,
      1
    );
  }


  /* =========================================================
     DATE RANGE
  ========================================================= */

  function getRange() {

    const now =
      new Date();


    let start =
      new Date(now);


    let end =
      new Date(now);


    /* =====================================================
       CUSTOM PERIOD
    ===================================================== */

    if (
      selectedPeriod === "CUSTOM"
    ) {

      if (
        !fromYear ||
        !fromMonth ||
        !toYear ||
        !toMonth
      ) {

        throw new Error(
          "Custom date controls unavailable."
        );
      }


      start =
        new Date(

          Number(
            fromYear.value
          ),

          Number(
            fromMonth.value
          ) - 1,

          1

        );


      end =
        new Date(

          Number(
            toYear.value
          ),

          Number(
            toMonth.value
          ),

          0

        );


      if (
        start > end
      ) {

        throw new Error(
          "The start date must be before the end date."
        );
      }


      /*
         Never request future observations.
      */

      if (
        end > now
      ) {

        end =
          new Date(now);
      }


      return {

        from:
          formatDate(start),

        to:
          formatDate(end)

      };
    }


    /* =====================================================
       PRESET PERIODS
    ===================================================== */

    switch (
      selectedPeriod
    ) {


      case "1M":

        start.setMonth(
          start.getMonth() - 1
        );

        break;


      case "6M":

        start.setMonth(
          start.getMonth() - 6
        );

        break;


      case "1Y":

        start.setFullYear(
          start.getFullYear() - 1
        );

        break;


      case "5Y":

        start.setFullYear(
          start.getFullYear() - 5
        );

        break;


      case "MAX":

        start =
          getMaximumStartDate();

        break;

    }


    return {

      from:
        formatDate(start),

      to:
        formatDate(end)

    };
  }


  /* =========================================================
     SYNC DATE SELECTORS
  ========================================================= */

  function syncDateSelectorsToPeriod() {

    if (
      !fromMonth ||
      !fromYear ||
      !toMonth ||
      !toYear
    ) {

      return;
    }


    /*
       Do not overwrite a user's custom selection.
    */

    if (
      selectedPeriod === "CUSTOM"
    ) {

      return;
    }


    const now =
      new Date();


    let start =
      new Date(now);


    const end =
      new Date(now);


    switch (
      selectedPeriod
    ) {


      case "1M":

        start.setMonth(
          start.getMonth() - 1
        );

        break;


      case "6M":

        start.setMonth(
          start.getMonth() - 6
        );

        break;


      case "1Y":

        start.setFullYear(
          start.getFullYear() - 1
        );

        break;


      case "5Y":

        start.setFullYear(
          start.getFullYear() - 5
        );

        break;


      case "MAX":

        start =
          getMaximumStartDate();

        break;


      default:

        return;
    }


    fromMonth.value =
      String(
        start.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    fromYear.value =
      String(
        start.getFullYear()
      );


    toMonth.value =
      String(
        end.getMonth() + 1
      ).padStart(
        2,
        "0"
      );


    toYear.value =
      String(
        end.getFullYear()
      );
  }


  /* =========================================================
     INITIAL SELECTOR VALUES
  ========================================================= */

  if (
    fromMonth
  ) {

    fromMonth.value =
      "01";
  }


  if (
    fromYear
  ) {

    fromYear.value =
      String(
        currentYear - 1
      );
  }


  if (
    toMonth
  ) {

    toMonth.value =
      String(
        new Date()
          .getMonth() + 1
      ).padStart(
        2,
        "0"
      );
  }


  if (
    toYear
  ) {

    toYear.value =
      String(
        currentYear
      );
  }


  /* =========================================================
     UI STATES
  ========================================================= */

  function clearError() {

    if (
      !errorElement
    ) {

      return;
    }


    errorElement.hidden =
      true;


    errorElement.textContent =
      "";
  }


  function showLoading() {

    clearError();


    if (
      !loading
    ) {

      return;
    }


    loading.innerHTML = `

      <div
        class="syvare-market-loader"
        aria-hidden="true"
      >

        <img
          src="assets/images/syvaré-loading.png"
          class="syvare-loading-favicon"
          alt=""
        >

      </div>

    `;


    loading.style.display =
      "flex";


    loading.setAttribute(
      "aria-hidden",
      "false"
    );
  }


  function hideLoading() {

    if (
      !loading
    ) {

      return;
    }


    loading.style.display =
      "none";


    loading.setAttribute(
      "aria-hidden",
      "true"
    );
  }


  function showError(
    message
  ) {

    hideLoading();


    /*
       If an error container is available,
       expose a clean visitor-friendly message.

       Your stylesheet can still decide whether
       this should be visually displayed.
    */

    if (
      errorElement
    ) {

      errorElement.textContent =
        message ||
        "Market data is temporarily unavailable.";


      errorElement.hidden =
        false;
    }


    console.warn(
      "[Syvaré Markets]",
      message
    );
  }


  /* =========================================================
     CACHE HELPERS
  ========================================================= */

  function createCacheKey(
    parameters
  ) {

    if (
      parameters.type === "fx"
    ) {

      return [

        "fx",

        parameters.base,

        parameters.quote,

        parameters.from,

        parameters.to

      ].join("|");
    }


    return [

      parameters.type,

      parameters.symbol,

      parameters.from,

      parameters.to

    ].join("|");
  }


  function saveCache(
    key,
    data
  ) {

    marketCache.set(
      key,
      {

        timestamp:
          Date.now(),

        data:
          data

      }
    );
  }


  function getExactCache(
    key
  ) {

    const entry =
      marketCache.get(
        key
      );


    if (
      !entry
    ) {

      return null;
    }


    return {

      data:
        entry.data,

      fresh:
        (
          Date.now() -
          entry.timestamp
        ) < CACHE_TTL

    };
  }


  /* =========================================================
     RANGE CACHE
  ========================================================= */

  function getInstrumentIdentity(
    parameters
  ) {

    if (
      parameters.type === "fx"
    ) {

      return (
        "fx|" +
        parameters.base +
        "|" +
        parameters.quote
      );
    }


    return (
      parameters.type +
      "|" +
      parameters.symbol
    );
  }


  function getCacheIdentityFromKey(
    key
  ) {

    const parts =
      key.split("|");


    if (
      parts[0] === "fx"
    ) {

      return (
        parts[0] +
        "|" +
        parts[1] +
        "|" +
        parts[2]
      );
    }


    return (
      parts[0] +
      "|" +
      parts[1]
    );
  }


  function getRangeFromCacheKey(
    key
  ) {

    const parts =
      key.split("|");


    if (
      parts[0] === "fx"
    ) {

      return {

        from:
          parts[3],

        to:
          parts[4]

      };
    }


    return {

      from:
        parts[2],

      to:
        parts[3]

    };
  }


  /* =========================================================
     SLICE CACHED MARKET DATA

     IMPORTANT:
     Policy-rate series must preserve the rate that was
     already in effect at the beginning of a requested range.
  ========================================================= */

  function sliceMarketData(
    data,
    from,
    to
  ) {

    if (
      !data ||
      !Array.isArray(
        data.observations
      ) ||
      !data.observations.length
    ) {

      return null;
    }


    const sourceObservations =
      data.observations

        .filter(
          function (
            point
          ) {

            return (

              point &&

              point.date &&

              Number.isFinite(
                Number(
                  point.value
                )
              )

            );

          }
        )

        .slice()

        .sort(
          function (
            a,
            b
          ) {

            return a.date
              .localeCompare(
                b.date
              );

          }
        );


    if (
      !sourceObservations.length
    ) {

      return null;
    }


    let observations =
      sourceObservations.filter(
        function (
          point
        ) {

          return (
            point.date >= from &&
            point.date <= to
          );

        }
      );


    /* =====================================================
       BANK RATE CACHE FIX
    ===================================================== */

    const isBankRate =
      data.type === "rate" &&
      data.symbol === "IUDBEDR";


    if (
      isBankRate
    ) {

      let rateAtStart =
        null;


      for (
        let index = 0;
        index < sourceObservations.length;
        index += 1
      ) {

        const point =
          sourceObservations[index];


        if (
          point.date <= from
        ) {

          rateAtStart =
            Number(
              point.value
            );

        } else {

          break;
        }

      }


      /*
         Anchor the rate at the actual requested FROM date.
      */

      if (
        rateAtStart !== null
      ) {

        observations =
          observations.filter(
            function (
              point
            ) {

              return (
                point.date !== from
              );

            }
          );


        observations.unshift(
          {

            date:
              from,

            value:
              rateAtStart

          }
        );
      }


      /*
         Extend the final known Bank Rate to TO.

         This is essential when no MPC change occurs
         during the requested period.
      */

      if (
        observations.length
      ) {

        let finalRate =
          Number(
            observations[
              observations.length - 1
            ].value
          );


        for (
          let index = 0;
          index < sourceObservations.length;
          index += 1
        ) {

          const point =
            sourceObservations[index];


          if (
            point.date > to
          ) {

            break;
          }


          if (
            point.date >= from
          ) {

            finalRate =
              Number(
                point.value
              );
          }

        }


        if (
          observations[
            observations.length - 1
          ].date !== to
        ) {

          observations.push(
            {

              date:
                to,

              value:
                finalRate

            }
          );
        }

      }

    }


    if (
      !observations.length
    ) {

      return null;
    }


    observations.sort(
      function (
        a,
        b
      ) {

        return a.date
          .localeCompare(
            b.date
          );

      }
    );


    return Object.assign(
      {},
      data,
      {

        observations:
          observations,

        latestDate:
          observations[
            observations.length - 1
          ].date

      }
    );
  }


  function findLargerCachedRange(
    parameters
  ) {

    const identity =
      getInstrumentIdentity(
        parameters
      );


    for (
      const [
        key,
        entry
      ] of marketCache.entries()
    ) {

      if (
        getCacheIdentityFromKey(
          key
        ) !== identity
      ) {

        continue;
      }


      const range =
        getRangeFromCacheKey(
          key
        );


      /*
         Existing cached range must completely contain
         the newly requested range.
      */

      if (
        range.from <=
          parameters.from &&
        range.to >=
          parameters.to
      ) {

        const sliced =
          sliceMarketData(

            entry.data,

            parameters.from,

            parameters.to

          );


        if (
          sliced
        ) {

          return {

            data:
              sliced,

            fresh:
              (
                Date.now() -
                entry.timestamp
              ) < CACHE_TTL

          };
        }

      }

    }


    return null;
  }


  /* =========================================================
     REVERSE FX CACHE
  ========================================================= */

  function createReverseFXData(
    parameters
  ) {

    if (
      parameters.type !== "fx"
    ) {

      return null;
    }


    const reverseParameters = {

      type:
        "fx",

      base:
        parameters.quote,

      quote:
        parameters.base,

      from:
        parameters.from,

      to:
        parameters.to

    };


    const reverseKey =
      createCacheKey(
        reverseParameters
      );


    let cached =
      getExactCache(
        reverseKey
      );


    if (
      !cached
    ) {

      cached =
        findLargerCachedRange(
          reverseParameters
        );
    }


    if (
      !cached ||
      !cached.data ||
      !Array.isArray(
        cached.data.observations
      )
    ) {

      return null;
    }


    const observations =
      cached.data.observations

        .filter(
          function (
            point
          ) {

            return (

              Number.isFinite(
                Number(
                  point.value
                )
              ) &&

              Number(
                point.value
              ) !== 0

            );

          }
        )

        .map(
          function (
            point
          ) {

            return {

              date:
                point.date,

              value:
                1 /
                Number(
                  point.value
                )

            };

          }
        );


    if (
      !observations.length
    ) {

      return null;
    }


    return {

      fresh:
        cached.fresh,

      data: {

        type:
          "fx",

        name:
          parameters.base +
          " / " +
          parameters.quote,

        region:
          "Foreign Exchange",

        unit:
          "rate",

        source:
          cached.data.source ||
          "Frankfurter",

        latestDate:
          observations[
            observations.length - 1
          ].date,

        observations:
          observations

      }

    };
  }


  /* =========================================================
     X-AXIS FORMATTER
  ========================================================= */

  function formatXAxisDate(
    label
  ) {

    if (
      !label
    ) {

      return "";
    }


    const date =
      new Date(
        label +
        "T00:00:00"
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return label;
    }


    /*
       MAX
       ---------------------
       1975
       1985
       1995
       etc.
    */

    if (
      selectedPeriod === "MAX"
    ) {

      return String(
        date.getFullYear()
      );
    }


    /*
       5Y
       ---------------------
       Aug 21
       Aug 22
       etc.
    */

    if (
      selectedPeriod === "5Y"
    ) {

      return date
        .toLocaleDateString(
          "en-GB",
          {

            month:
              "short",

            year:
              "2-digit"

          }
        );
    }


    /*
       1Y
       ---------------------
       Aug
       Oct
       Dec
       etc.
    */

    if (
      selectedPeriod === "1Y"
    ) {

      return date
        .toLocaleDateString(
          "en-GB",
          {

            month:
              "short"

          }
        );
    }


    /*
       1M / 6M / CUSTOM
       ---------------------
       17 Jul
       01 Aug
       etc.
    */

    return date
      .toLocaleDateString(
        "en-GB",
        {

          day:
            "2-digit",

          month:
            "short"

        }
      );
  }


  /* =========================================================
     CHART
  ========================================================= */

  function drawChart(
    observations,
    data
  ) {

    if (
      typeof Chart ===
      "undefined"
    ) {

      throw new Error(
        "Chart library unavailable."
      );
    }


    if (
      !Array.isArray(
        observations
      ) ||
      !observations.length
    ) {

      throw new Error(
        "No observations are available for this period."
      );
    }


    const validObservations =
      observations

        .filter(
          function (
            point
          ) {

            return (

              point &&

              point.date &&

              Number.isFinite(
                Number(
                  point.value
                )
              )

            );

          }
        )

        .sort(
          function (
            a,
            b
          ) {

            return a.date
              .localeCompare(
                b.date
              );

          }
        );


    if (
      !validObservations.length
    ) {

      throw new Error(
        "No valid observations are available for this period."
      );
    }


    const labels =
      validObservations.map(
        function (
          point
        ) {

          return point.date;

        }
      );


    const values =
      validObservations.map(
        function (
          point
        ) {

          return Number(
            point.value
          );

        }
      );


    const context =
      canvas.getContext(
        "2d"
      );


    if (
      !context
    ) {

      throw new Error(
        "Chart context unavailable."
      );
    }


    /* =====================================================
       GRADIENT
    ===================================================== */

    const gradient =
      context
        .createLinearGradient(
          0,
          0,
          0,
          360
        );


    gradient.addColorStop(
      0,
      "rgba(17,24,39,0.13)"
    );


    gradient.addColorStop(
      1,
      "rgba(17,24,39,0)"
    );


    /* =====================================================
       BANK RATE DETECTION
    ===================================================== */

    const isBankRate =
      data &&
      data.type === "rate" &&
      (
        data.symbol === "IUDBEDR" ||
        (
          activeTab === "rates" &&
          activeRate === "uk-bank-rate"
        )
      );


    /* =====================================================
       FLAT SERIES DETECTION
    ===================================================== */

    const minimumValue =
      Math.min.apply(
        null,
        values
      );


    const maximumValue =
      Math.max.apply(
        null,
        values
      );


    const isFlatSeries =
      Math.abs(
        maximumValue -
        minimumValue
      ) <
      0.0000001;


    let suggestedMin;


    let suggestedMax;


    if (
      isFlatSeries
    ) {

      const value =
        values[0];


      let padding;


      /*
         Policy-rate flat periods need enough
         vertical breathing room to remain visible.
      */

      if (
        data &&
        data.type === "rate"
      ) {

        padding =
          Math.max(
            0.20,
            Math.abs(
              value
            ) *
            0.05
          );

      } else {

        padding =
          Math.max(
            Math.abs(
              value
            ) *
            0.05,
            0.01
          );

      }


      suggestedMin =
        value -
        padding;


      suggestedMax =
        value +
        padding;
    }


    /* =====================================================
       X-AXIS TICK COUNT
    ===================================================== */

    let maximumXTicks =
      5;


    if (
      selectedPeriod === "6M"
    ) {

      maximumXTicks =
        6;
    }


    else if (
      selectedPeriod === "1Y"
    ) {

      maximumXTicks =
        6;
    }


    else if (
      selectedPeriod === "5Y"
    ) {

      maximumXTicks =
        6;
    }


    else if (
      selectedPeriod === "MAX"
    ) {

      maximumXTicks =
        6;
    }


    /*
       Fewer X labels on narrow phones.
    */

    if (
      window.innerWidth <= 480
    ) {

      maximumXTicks =
        Math.min(
          maximumXTicks,
          5
        );
    }


    /* =====================================================
       DESTROY PREVIOUS CHART
    ===================================================== */

    if (
      chart
    ) {

      chart.destroy();


      chart =
        null;
    }


    /* =====================================================
       BUILD CHART
    ===================================================== */

    chart =
      new Chart(
        context,
        {

          type:
            "line",


          data: {

            labels:
              labels,


            datasets: [

              {

                data:
                  values,


                borderColor:
                  "rgba(17,24,39,0.92)",


                backgroundColor:
                  gradient,


                borderWidth:
                  isFlatSeries
                    ? 1.8
                    : 1.6,


                fill:
                  true,


                pointRadius:
                  0,


                pointHoverRadius:
                  4,


                pointHitRadius:
                  14,


                borderJoinStyle:
                  "round",


                borderCapStyle:
                  "round",


                /*
                   Official Bank Rate changes are discrete.
                */

                stepped:
                  isBankRate
                    ? "after"
                    : false,


                tension:
                  isBankRate
                    ? 0
                    : 0.24

              }

            ]

          },


          options: {

            responsive:
              true,


            maintainAspectRatio:
              false,


            animation: {

              duration:
                180

            },


            interaction: {

              intersect:
                false,


              mode:
                "index"

            },


            plugins: {

              legend: {

                display:
                  false

              },


              tooltip: {

                displayColors:
                  false,


                callbacks: {

                  title:
                    function (
                      items
                    ) {

                      if (
                        !items ||
                        !items.length
                      ) {

                        return "";
                      }


                      const raw =
                        items[0].label;


                      const date =
                        new Date(
                          raw +
                          "T00:00:00"
                        );


                      if (
                        Number.isNaN(
                          date.getTime()
                        )
                      ) {

                        return raw;
                      }


                      return date
                        .toLocaleDateString(
                          "en-GB",
                          {

                            day:
                              "2-digit",

                            month:
                              "short",

                            year:
                              "numeric"

                          }
                        );
                    },


                  label:
                    function (
                      context
                    ) {

                      const value =
                        Number(
                          context.parsed.y
                        );


                      if (
                        data &&
                        data.unit === "%"
                      ) {

                        return (
                          value.toFixed(
                            2
                          ) +
                          "%"
                        );
                      }


                      if (
                        data &&
                        data.type === "fx"
                      ) {

                        return value
                          .toFixed(
                            4
                          );
                      }


                      return value
                        .toLocaleString(
                          "en-GB",
                          {

                            maximumFractionDigits:
                              2

                          }
                        );
                    }

                }

              },


              /*
                 Don't decimate Bank Rate because
                 every policy-change point matters.
              */

              decimation: {

                enabled:
                  !isBankRate,

                algorithm:
                  "min-max",

                samples:
                  600

              }

            },


            scales: {

              /* =================================================
                 X AXIS
              ================================================= */

              x: {

                grid: {

                  display:
                    false

                },


                ticks: {

                  maxTicksLimit:
                    maximumXTicks,


                  autoSkip:
                    true,


                  maxRotation:
                    0,


                  minRotation:
                    0,


                  color:
                    "#999",


                  font: {

                    size:
                      9

                  },


                  callback:
                    function (
                      value
                    ) {

                      const label =
                        this.getLabelForValue(
                          value
                        );


                      return formatXAxisDate(
                        label
                      );
                    }

                }

              },


              /* =================================================
                 Y AXIS
              ================================================= */

              y: {

                position:
                  "right",


                /*
                   Flat-series fix.

                   Example:
                   Bank Rate remains 3.75% throughout
                   an entire one-month period.
                */

                min:
                  isFlatSeries
                    ? suggestedMin
                    : undefined,


                max:
                  isFlatSeries
                    ? suggestedMax
                    : undefined,


                border: {

                  display:
                    false

                },


                grid: {

                  color:
                    "rgba(0,0,0,0.04)"

                },


                ticks: {

                  color:
                    "#999",


                  font: {

                    size:
                      9

                  },


                  callback:
                    function (
                      value
                    ) {

                      const numericValue =
                        Number(
                          value
                        );


                      /*
                         Interest-rate axes.
                      */

                      if (
                        data &&
                        data.type === "rate"
                      ) {

                        return numericValue
                          .toFixed(
                            2
                          );
                      }


                      /*
                         Small FX values:
                         INR / GBP etc.
                      */

                      if (
                        data &&
                        data.type === "fx" &&
                        Math.abs(
                          numericValue
                        ) < 1
                      ) {

                        return numericValue
                          .toFixed(
                            4
                          );
                      }


                      return numericValue
                        .toLocaleString(
                          "en-GB",
                          {

                            maximumFractionDigits:
                              2

                          }
                        );
                    }

                }

              }

            }

          }

        }
      );
  }


  /* =========================================================
     SUMMARY
  ========================================================= */

  function updateSummary(
    data
  ) {

    const observations =
      Array.isArray(
        data.observations
      )

        ? data.observations.filter(
            function (
              point
            ) {

              return (

                point &&

                Number.isFinite(
                  Number(
                    point.value
                  )
                )

              );

            }
          )

        : [];


    if (
      !observations.length
    ) {

      return;
    }


    const first =
      Number(
        observations[0].value
      );


    const latest =
      Number(
        observations[
          observations.length - 1
        ].value
      );


    /* =====================================================
       CURRENT VALUE
    ===================================================== */

    if (
      valueElement
    ) {

      if (
        data.unit === "%"
      ) {

        valueElement.textContent =
          latest.toFixed(
            2
          ) +
          "%";

      }


      else if (
        data.type === "fx"
      ) {

        valueElement.textContent =
          latest.toFixed(
            4
          );

      }


      else {

        valueElement.textContent =
          latest.toLocaleString(
            "en-GB",
            {

              maximumFractionDigits:
                2

            }
          );

      }

    }


    /* =====================================================
       MOVEMENT
    ===================================================== */

    if (
      movementElement
    ) {

      movementElement
        .classList
        .remove(
          "positive",
          "negative"
        );


      /*
         Interest rates:
         basis-point movement.
      */

      if (
        data.type === "rate" ||
        data.unit === "%"
      ) {

        const basisPointChange =
          Math.round(
            (
              latest -
              first
            ) *
            100
          );


        movementElement.textContent =

          (
            basisPointChange > 0
              ? "+"
              : ""
          ) +

          basisPointChange +

          " bps";


        if (
          basisPointChange > 0
        ) {

          movementElement
            .classList
            .add(
              "positive"
            );

        }


        else if (
          basisPointChange < 0
        ) {

          movementElement
            .classList
            .add(
              "negative"
            );

        }

      }


      /*
         Equities and FX:
         percentage movement.
      */

      else {

        const percentageChange =
          first !== 0

            ? (
                (
                  latest -
                  first
                ) /
                first
              ) *
              100

            : 0;


        movementElement.textContent =

          (
            percentageChange > 0
              ? "+"
              : ""
          ) +

          percentageChange.toFixed(
            2
          ) +

          "%";


        if (
          percentageChange > 0
        ) {

          movementElement
            .classList
            .add(
              "positive"
            );

        }


        else if (
          percentageChange < 0
        ) {

          movementElement
            .classList
            .add(
              "negative"
            );

        }

      }

    }


    /* =====================================================
       MARKET INFORMATION
    ===================================================== */

    if (
      title &&
      data.name
    ) {

      title.textContent =
        data.name;
    }


    if (
      region &&
      data.region
    ) {

      region.textContent =
        String(
          data.region
        ).toUpperCase();
    }


    if (
      sourceElement
    ) {

      sourceElement.textContent =
        data.source

          ? "Source: " +
            data.source

          : "";
    }


    if (
      updatedElement
    ) {

      updatedElement.textContent =
        data.latestDate

          ? "Latest observation: " +
            data.latestDate

          : "";
    }
  }


  /* =========================================================
     DISPLAY DATA
  ========================================================= */

  function displayMarketData(
    data
  ) {

    clearError();


    drawChart(
      data.observations,
      data
    );


    updateSummary(
      data
    );


    hideLoading();
  }


  /* =========================================================
     FETCH MARKET DATA
  ========================================================= */

  async function fetchMarketData(
    url,
    cacheKey,
    controller
  ) {

    const response =
      await fetch(
        url.toString(),
        {

          method:
            "GET",


          headers: {

            "Accept":
              "application/json"

          },


          /*
             Allow normal browser/CDN caching.
          */

          cache:
            "default",


          signal:
            controller.signal

        }
      );


    const responseText =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(
          responseText
        );

    }


    catch (
      parseError
    ) {

      throw new Error(
        "Market data service returned an invalid response."
      );

    }


    if (
      !response.ok
    ) {

      throw new Error(
        data.error ||
        data.message ||
        "Market data unavailable."
      );
    }


    if (
      !data ||
      !Array.isArray(
        data.observations
      ) ||
      !data.observations.length
    ) {

      throw new Error(
        "No market observations were returned for this period."
      );
    }


    return data;
  }


  /* =========================================================
     API REQUEST
  ========================================================= */

  async function requestMarket(
    parameters,
    options = {}
  ) {

    const background =
      options.background ===
      true;


    const forceRefresh =
      options.forceRefresh ===
      true;


    const thisRequest =
      ++requestCounter;


    const cacheKey =
      createCacheKey(
        parameters
      );


    /* =====================================================
       1. EXACT CACHE
    ===================================================== */

    if (
      !forceRefresh
    ) {

      const exactCache =
        getExactCache(
          cacheKey
        );


      if (
        exactCache &&
        exactCache.fresh
      ) {

        displayMarketData(
          exactCache.data
        );


        return;
      }


      /* ===================================================
         2. LARGER RANGE CACHE
      =================================================== */

      const rangeCache =
        findLargerCachedRange(
          parameters
        );


      if (
        rangeCache &&
        rangeCache.fresh
      ) {

        saveCache(
          cacheKey,
          rangeCache.data
        );


        displayMarketData(
          rangeCache.data
        );


        return;
      }


      /* ===================================================
         3. REVERSE FX CACHE
      =================================================== */

      const reverseFX =
        createReverseFXData(
          parameters
        );


      if (
        reverseFX &&
        reverseFX.fresh
      ) {

        saveCache(
          cacheKey,
          reverseFX.data
        );


        displayMarketData(
          reverseFX.data
        );


        return;
      }

    }


    /* =====================================================
       BUILD REQUEST URL
    ===================================================== */

    const url =
      new URL(
        MARKET_API_BASE +
        "/market"
      );


    Object.keys(
      parameters
    ).forEach(
      function (
        key
      ) {

        url.searchParams.set(
          key,
          parameters[key]
        );

      }
    );


    /* =====================================================
       LOADING STATE
    ===================================================== */

    if (
      !background
    ) {

      showLoading();
    }


    /* =====================================================
       CANCEL OBSOLETE FOREGROUND REQUEST
    ===================================================== */

    if (
      !background &&
      activeController
    ) {

      activeController.abort();


      activeController =
        null;
    }


    /* =====================================================
       DEDUPLICATE IDENTICAL REQUEST
    ===================================================== */

    let pending =
      pendingRequests.get(
        cacheKey
      );


    let controller;


    let requestPromise;


    if (
      pending
    ) {

      controller =
        pending.controller;


      requestPromise =
        pending.promise;

    } else {

      controller =
        new AbortController();


      requestPromise =
        fetchMarketData(
          url,
          cacheKey,
          controller
        );


      pending =
        {

          controller:
            controller,

          promise:
            requestPromise

        };


      pendingRequests.set(
        cacheKey,
        pending
      );

    }


    if (
      !background
    ) {

      activeController =
        controller;
    }


    try {

      const data =
        await requestPromise;


      /* ===================================================
         SAVE SUCCESSFUL RESPONSE
      =================================================== */

      saveCache(
        cacheKey,
        data
      );


      /*
         Background refresh updates the cache only.

         It doesn't redraw or interrupt the visitor.
      */

      if (
        background
      ) {

        return;
      }


      /*
         Ignore an old response if the visitor has
         already selected another market.
      */

      if (
        thisRequest !==
        requestCounter
      ) {

        return;
      }


      displayMarketData(
        data
      );

    }


    catch (
      error
    ) {

      /* ===================================================
         NORMAL REQUEST CANCELLATION
      =================================================== */

      if (
        error &&
        error.name ===
        "AbortError"
      ) {

        return;
      }


      /* ===================================================
         BACKGROUND ERROR
      =================================================== */

      if (
        background
      ) {

        console.warn(
          "[Syvaré Markets background refresh]",
          error
        );


        return;
      }


      if (
        thisRequest !==
        requestCounter
      ) {

        return;
      }


      /* ===================================================
         STALE EXACT CACHE FALLBACK
      =================================================== */

      const staleExact =
        getExactCache(
          cacheKey
        );


      if (
        staleExact
      ) {

        displayMarketData(
          staleExact.data
        );


        return;
      }


      /* ===================================================
         STALE RANGE CACHE FALLBACK
      =================================================== */

      const staleRange =
        findLargerCachedRange(
          parameters
        );


      if (
        staleRange
      ) {

        displayMarketData(
          staleRange.data
        );


        return;
      }


      /* ===================================================
         NO FALLBACK AVAILABLE
      =================================================== */

      showError(

        error &&
        error.message

          ? error.message

          : "Market data is temporarily unavailable."

      );

    }


    finally {

      const currentPending =
        pendingRequests.get(
          cacheKey
        );


      /*
         Only remove this entry if it still corresponds
         to the Promise used by this request.
      */

      if (
        currentPending &&
        currentPending.promise ===
          requestPromise
      ) {

        pendingRequests.delete(
          cacheKey
        );
      }


      if (
        activeController ===
        controller
      ) {

        activeController =
          null;
      }

    }
  }


  /* =========================================================
     CREATE ACTIVE PARAMETERS
  ========================================================= */

  function getActiveParameters() {

    const range =
      getRange();


    /* =====================================================
       FX
    ===================================================== */

    if (
      activeTab === "fx"
    ) {

      if (
        !fxBase ||
        !fxQuote
      ) {

        throw new Error(
          "Currency controls unavailable."
        );
      }


      if (
        fxBase.value ===
        fxQuote.value
      ) {

        throw new Error(
          "Please choose two different currencies."
        );
      }


      return {

        type:
          "fx",

        base:
          fxBase.value,

        quote:
          fxQuote.value,

        from:
          range.from,

        to:
          range.to

      };
    }


    /* =====================================================
       RATES
    ===================================================== */

    if (
      activeTab === "rates"
    ) {

      return {

        type:
          "rate",

        symbol:
          activeRate,

        from:
          range.from,

        to:
          range.to

      };
    }


    /* =====================================================
       EQUITIES
    ===================================================== */

    return {

      type:
        "equity",

      symbol:
        activeEquity,

      from:
        range.from,

      to:
        range.to

    };
  }


  /* =========================================================
     LOAD ACTIVE MARKET
  ========================================================= */

  function loadMarket(
    options = {}
  ) {

    let parameters;


    try {

      parameters =
        getActiveParameters();

    }


    catch (
      error
    ) {

      showError(
        error.message
      );


      return;
    }


    requestMarket(
      parameters,
      options
    );
  }


  /* =========================================================
     TAB EVENTS
  ========================================================= */

  tabs.forEach(
    function (
      tab
    ) {

      tab.addEventListener(
        "click",
        function () {

          activeTab =
            tab.dataset
              .marketTab;


          tabs.forEach(
            function (
              item
            ) {

              item.classList.toggle(

                "active",

                item ===
                  tab

              );

            }
          );


          panels.forEach(
            function (
              panel
            ) {

              panel.classList.toggle(

                "active",

                panel.dataset
                  .marketPanel ===
                  activeTab

              );

            }
          );


          syncDateSelectorsToPeriod();


          loadMarket();

        }
      );

    }
  );


  /* =========================================================
     EQUITY EVENTS
  ========================================================= */

  equityButtons.forEach(
    function (
      button
    ) {

      button.addEventListener(
        "click",
        function () {

          activeEquity =
            button.dataset
              .equity;


          equityButtons.forEach(
            function (
              item
            ) {

              item.classList.toggle(

                "active",

                item ===
                  button

              );

            }
          );


          syncDateSelectorsToPeriod();


          loadMarket();

        }
      );

    }
  );


  /* =========================================================
     RATE EVENTS
  ========================================================= */

  rateButtons.forEach(
    function (
      button
    ) {

      button.addEventListener(
        "click",
        function () {

          activeRate =
            button.dataset
              .rate;


          rateButtons.forEach(
            function (
              item
            ) {

              item.classList.toggle(

                "active",

                item ===
                  button

              );

            }
          );


          syncDateSelectorsToPeriod();


          loadMarket();

        }
      );

    }
  );


  /* =========================================================
     FX EVENTS
  ========================================================= */

  if (
    fxBase
  ) {

    fxBase.addEventListener(
      "change",
      function () {

        syncDateSelectorsToPeriod();


        loadMarket();

      }
    );

  }


  if (
    fxQuote
  ) {

    fxQuote.addEventListener(
      "change",
      function () {

        syncDateSelectorsToPeriod();


        loadMarket();

      }
    );

  }


  if (
    fxSwap
  ) {

    fxSwap.addEventListener(
      "click",
      function () {

        if (
          !fxBase ||
          !fxQuote
        ) {

          return;
        }


        const previous =
          fxBase.value;


        fxBase.value =
          fxQuote.value;


        fxQuote.value =
          previous;


        syncDateSelectorsToPeriod();


        /*
           Reverse FX caching means this can often
           redraw without another API request.
        */

        loadMarket();

      }
    );

  }


  /* =========================================================
     PERIOD BUTTONS
  ========================================================= */

  periodButtons.forEach(
    function (
      button
    ) {

      button.addEventListener(
        "click",
        function () {

          selectedPeriod =
            String(
              button.dataset
                .period ||
              ""
            ).toUpperCase();


          periodButtons.forEach(
            function (
              item
            ) {

              item.classList.toggle(

                "active",

                item ===
                  button

              );

            }
          );


          if (
            customPeriod
          ) {

            customPeriod.hidden =
              selectedPeriod !==
              "CUSTOM";

          }


          /*
             CUSTOM waits until View Period is pressed.
          */

          if (
            selectedPeriod !==
            "CUSTOM"
          ) {

            syncDateSelectorsToPeriod();


            loadMarket();

          }

        }
      );

    }
  );


  /* =========================================================
     CUSTOM PERIOD
  ========================================================= */

  if (
    applyPeriod
  ) {

    applyPeriod.addEventListener(
      "click",
      function () {

        selectedPeriod =
          "CUSTOM";


        periodButtons.forEach(
          function (
            item
          ) {

            item.classList.toggle(

              "active",

              String(
                item.dataset
                  .period ||
                ""
              ).toUpperCase() ===
                "CUSTOM"

            );

          }
        );


        loadMarket();

      }
    );

  }


  /* =========================================================
     AUTO REFRESH

     Every five minutes:
     • refresh active market
     • no loader
     • no visual interruption
     • refresh cache in background
  ========================================================= */

  setInterval(
    function () {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadMarket(
          {

            background:
              true,

            forceRefresh:
              true

          }
        );

      }

    },

    300000

  );


  /* =========================================================
     REFRESH WHEN USER RETURNS
  ========================================================= */

  document.addEventListener(
    "visibilitychange",
    function () {

      if (
        document.visibilityState ===
        "visible"
      ) {

        loadMarket();

      }

    }
  );


  /* =========================================================
     WINDOW RESIZE

     Chart.js is responsive itself.

     We only resize explicitly after orientation/
     viewport changes to improve Safari mobile behaviour.
  ========================================================= */

  let resizeTimer =
    null;


  window.addEventListener(
    "resize",
    function () {

      clearTimeout(
        resizeTimer
      );


      resizeTimer =
        setTimeout(
          function () {

            if (
              chart
            ) {

              chart.resize();
            }

          },

          120

        );

    }
  );


  /* =========================================================
     INITIAL
  ========================================================= */

  clearError();


  hideLoading();


  syncDateSelectorsToPeriod();


  loadMarket();

});
