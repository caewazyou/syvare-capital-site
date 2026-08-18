/* =========================================================
   SYVARÉ CAPITAL
   MARKET DATA WORKER — V4.1

   PROVIDERS
   ---------------------------------------------------------
   Equities:
     Yahoo Finance
       • FTSE 100
       • FTSE 250
       • S&P 500
       • Nasdaq Composite

   FX:
     Frankfurter
       • Edge caching enabled

   UK Rates:
     Bank of England

   US Rates:
     U.S. Department of the Treasury
========================================================= */


/* =========================================================
   MARKET CONFIGURATION
========================================================= */

const MARKET_CONFIG = {

  equities: {

    ftse100: {
      providers: ["yahoo"],
      ticker: "^FTSE",
      name: "FTSE 100",
      region: "United Kingdom",
      currency: "GBP"
    },

    ftse250: {
      providers: ["yahoo"],
      ticker: "^FTMC",
      name: "FTSE 250",
      region: "United Kingdom",
      currency: "GBP"
    },

    sp500: {
      providers: ["yahoo"],
      ticker: "^GSPC",
      name: "S&P 500",
      region: "United States",
      currency: "USD"
    },

    nasdaq: {
      providers: ["yahoo"],
      ticker: "^IXIC",
      name: "Nasdaq Composite",
      region: "United States",
      currency: "USD"
    }

  },


  rates: {

    "uk-bank-rate": {
      providers: ["bankOfEngland"],
      name: "Bank Rate",
      region: "United Kingdom"
    },

    "us-2y": {
      providers: ["usTreasury"],
      treasuryField: "BC_2YEAR",
      name: "US 2-Year Treasury",
      region: "United States"
    },

    "us-10y": {
      providers: ["usTreasury"],
      treasuryField: "BC_10YEAR",
      name: "US 10-Year Treasury",
      region: "United States"
    }

  }

};


/* =========================================================
   PROVIDER STATUS
========================================================= */

const PROVIDERS = {

  yahoo: {
    enabled: true
  },

  frankfurter: {
    enabled: true
  },

  bankOfEngland: {
    enabled: true
  },

  usTreasury: {
    enabled: true
  }

};


/* =========================================================
   RESPONSE / CORS
========================================================= */

const CORS_HEADERS = {

  "Access-Control-Allow-Origin": "*",

  "Access-Control-Allow-Methods":
    "GET, OPTIONS",

  "Access-Control-Allow-Headers":
    "Content-Type",

  "Content-Type":
    "application/json; charset=utf-8",

  "Cache-Control":
    "public, max-age=300"

};


function jsonResponse(
  data,
  status = 200
) {

  return new Response(

    JSON.stringify(data),

    {
      status: status,
      headers: CORS_HEADERS
    }

  );
}


/* =========================================================
   DATE HELPERS
========================================================= */

function isValidDateString(value) {

  return /^\d{4}-\d{2}-\d{2}$/
    .test(value || "");
}


function parseDate(value) {

  return new Date(
    value + "T00:00:00Z"
  );
}


function insideRange(
  date,
  from,
  to
) {

  const point =
    parseDate(date);

  return (
    point >= parseDate(from) &&
    point <= parseDate(to)
  );
}


function formatDate(date) {

  return date
    .toISOString()
    .slice(0, 10);
}


function unixSeconds(dateString) {

  return Math.floor(
    parseDate(dateString).getTime() /
    1000
  );
}


function addDays(
  dateString,
  days
) {

  const date =
    parseDate(dateString);

  date.setUTCDate(
    date.getUTCDate() + days
  );

  return formatDate(date);
}


/* =========================================================
   CSV PARSER
========================================================= */

function parseCSV(text) {

  const lines =
    text
      .replace(/\r/g, "")
      .split("\n")
      .filter(
        function (line) {
          return line.trim();
        }
      );


  if (!lines.length) {

    return [];
  }


  function parseLine(line) {

    const values = [];

    let value = "";
    let quoted = false;


    for (
      let index = 0;
      index < line.length;
      index += 1
    ) {

      const character =
        line[index];


      if (character === '"') {

        if (
          quoted &&
          line[index + 1] === '"'
        ) {

          value += '"';
          index += 1;

        } else {

          quoted = !quoted;
        }

      } else if (
        character === "," &&
        !quoted
      ) {

        values.push(
          value.trim()
        );

        value = "";

      } else {

        value += character;
      }
    }


    values.push(
      value.trim()
    );


    return values;
  }


  const headers =
    parseLine(
      lines[0]
    );


  const rows = [];


  for (
    let index = 1;
    index < lines.length;
    index += 1
  ) {

    const values =
      parseLine(
        lines[index]
      );


    const row = {};


    headers.forEach(
      function (
        header,
        headerIndex
      ) {

        row[header] =
          values[headerIndex] !== undefined
            ? values[headerIndex]
            : "";

      }
    );


    rows.push(row);
  }


  return rows;
}


/* =========================================================
   OBSERVATION CLEANING
========================================================= */

function cleanObservations(rows) {

  const seen =
    new Map();


  rows.forEach(
    function (row) {

      if (
        !row ||
        !row.date ||
        !Number.isFinite(
          Number(row.value)
        )
      ) {

        return;
      }


      seen.set(
        row.date,
        {
          date: row.date,
          value: Number(row.value)
        }
      );

    }
  );


  return Array.from(
    seen.values()
  ).sort(
    function (a, b) {

      return a.date
        .localeCompare(b.date);

    }
  );
}


/* =========================================================
   DOWNSAMPLING
========================================================= */

function downsample(
  rows,
  maxPoints = 1000
) {

  if (
    rows.length <= maxPoints
  ) {

    return rows;
  }


  const step =
    Math.ceil(
      rows.length /
      maxPoints
    );


  const result = [];


  for (
    let index = 0;
    index < rows.length;
    index += step
  ) {

    result.push(
      rows[index]
    );
  }


  const last =
    rows[
      rows.length - 1
    ];


  const selectedLast =
    result[
      result.length - 1
    ];


  if (
    !selectedLast ||
    selectedLast.date !== last.date
  ) {

    result.push(last);
  }


  return result;
}


/* =========================================================
   STANDARD MARKET RESULT
========================================================= */

function marketResult({
  type,
  name,
  symbol = null,
  region,
  unit,
  currency = null,
  source,
  observations
}) {

  const clean =
    cleanObservations(
      observations
    );


  if (!clean.length) {

    throw new Error(
      "No observations are available for this period."
    );
  }


  const sampled =
    downsample(clean);


  const result = {

    type: type,

    name: name,

    region: region,

    unit: unit,

    source: source,

    latestDate:
      clean[
        clean.length - 1
      ].date,

    observations:
      sampled

  };


  if (symbol) {

    result.symbol =
      symbol;
  }


  if (currency) {

    result.currency =
      currency;
  }


  return result;
}


/* =========================================================
   PROVIDER 1
   YAHOO FINANCE — EQUITIES
========================================================= */

async function getYahooEquity(
  config,
  from,
  to
) {

  if (
    !PROVIDERS.yahoo.enabled
  ) {

    throw new Error(
      "Yahoo Finance provider disabled."
    );
  }


  const period1 =
    unixSeconds(from);


  const period2 =
    unixSeconds(
      addDays(to, 1)
    );


  const ticker =
    encodeURIComponent(
      config.ticker
    );


  const endpoint =
    "https://query1.finance.yahoo.com/v8/finance/chart/" +
    ticker +
    "?period1=" +
    period1 +
    "&period2=" +
    period2 +
    "&interval=1d" +
    "&events=history" +
    "&includeAdjustedClose=true";


  const response =
    await fetch(
      endpoint,
      {
        headers: {

          "Accept":
            "application/json,text/plain,*/*",

          "User-Agent":
            "Mozilla/5.0"

        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "Yahoo Finance returned HTTP " +
      response.status +
      "."
    );
  }


  const payload =
    await response.json();


  if (
    !payload ||
    !payload.chart
  ) {

    throw new Error(
      "Unexpected Yahoo Finance response."
    );
  }


  if (
    payload.chart.error
  ) {

    throw new Error(
      payload.chart.error.description ||
      "Yahoo Finance returned an error."
    );
  }


  const result =
    payload.chart.result &&
    payload.chart.result[0];


  if (!result) {

    throw new Error(
      "Yahoo Finance returned no market data."
    );
  }


  const timestamps =
    Array.isArray(
      result.timestamp
    )
      ? result.timestamp
      : [];


  const quote =
    result.indicators &&
    result.indicators.quote &&
    result.indicators.quote[0];


  const closes =
    quote &&
    Array.isArray(
      quote.close
    )
      ? quote.close
      : [];


  const observations = [];


  for (
    let index = 0;
    index < timestamps.length;
    index += 1
  ) {

    const timestamp =
      timestamps[index];


    const close =
      closes[index];


    if (
      !Number.isFinite(
        Number(timestamp)
      ) ||
      close === null ||
      close === undefined ||
      !Number.isFinite(
        Number(close)
      )
    ) {

      continue;
    }


    const date =
      new Date(
        Number(timestamp) *
        1000
      )
        .toISOString()
        .slice(0, 10);


    if (
      !insideRange(
        date,
        from,
        to
      )
    ) {

      continue;
    }


    observations.push({

      date: date,

      value:
        Number(close)

    });
  }


  return marketResult({

    type:
      "equity",

    name:
      config.name,

    symbol:
      config.ticker,

    region:
      config.region,

    unit:
      "index",

    currency:
      config.currency,

    source:
      "Yahoo Finance",

    observations:
      observations

  });
}


/* =========================================================
   PROVIDER 2
   FRANKFURTER — FOREIGN EXCHANGE

   V4.1:
   Cloudflare edge cache added.
========================================================= */

async function getFrankfurterFX(
  base,
  quote,
  from,
  to
) {

  if (
    !PROVIDERS.frankfurter.enabled
  ) {

    throw new Error(
      "Frankfurter provider disabled."
    );
  }


  if (
    base === quote
  ) {

    throw new Error(
      "Please select two different currencies."
    );
  }


  const durationDays =
    Math.max(
      1,
      (
        parseDate(to).getTime() -
        parseDate(from).getTime()
      ) /
      86400000
    );


  /*
    Reduce the amount of historical data transferred.

    > 10 years = monthly
    > 2 years  = weekly
  */

  let grouping = "";


  if (
    durationDays > 3650
  ) {

    grouping =
      "&group=month";

  } else if (
    durationDays > 730
  ) {

    grouping =
      "&group=week";
  }


  const endpoint =
    "https://api.frankfurter.dev/v2/rates" +

    "?base=" +
    encodeURIComponent(base) +

    "&quotes=" +
    encodeURIComponent(quote) +

    "&from=" +
    encodeURIComponent(from) +

    "&to=" +
    encodeURIComponent(to) +

    grouping;


  /* =====================================================
     CLOUDFLARE EDGE CACHE

     Repeated requests for exactly the same FX pair and
     date range can now be served from Cloudflare instead
     of contacting Frankfurter again.
  ===================================================== */

  const cache =
    caches.default;


  const cacheKey =
    new Request(
      endpoint,
      {
        method: "GET"
      }
    );


  let response =
    await cache.match(
      cacheKey
    );


  if (!response) {

    const providerResponse =
      await fetch(
        endpoint,
        {
          headers: {

            "Accept":
              "application/json"

          }
        }
      );


    if (!providerResponse.ok) {

      throw new Error(
        "Foreign exchange data is temporarily unavailable."
      );
    }


    /*
      Copy the provider response.

      Historical FX observations can safely remain in
      Cloudflare's edge cache for 24 hours.
    */

    const cachedHeaders =
      new Headers(
        providerResponse.headers
      );


    cachedHeaders.set(
      "Cache-Control",
      "public, max-age=86400"
    );


    response =
      new Response(
        providerResponse.body,
        {
          status:
            providerResponse.status,

          statusText:
            providerResponse.statusText,

          headers:
            cachedHeaders
        }
      );


    /*
      Store a clone.

      If caching is unavailable in the current environment,
      the market request itself still succeeds.
    */

    try {

      await cache.put(
        cacheKey,
        response.clone()
      );

    } catch (cacheError) {

      console.warn(
        "FX cache write failed:",
        cacheError
      );
    }

  }


  if (!response.ok) {

    throw new Error(
      "Foreign exchange data is temporarily unavailable."
    );
  }


  const payload =
    await response.json();


  if (
    !Array.isArray(payload)
  ) {

    throw new Error(
      "Unexpected FX provider response."
    );
  }


  const observations =
    payload
      .filter(
        function (row) {

          return (
            row &&
            row.date &&
            String(
              row.quote
            ).toUpperCase() ===
              quote.toUpperCase() &&
            Number.isFinite(
              Number(row.rate)
            )
          );

        }
      )
      .map(
        function (row) {

          return {

            date:
              row.date,

            value:
              Number(row.rate)

          };

        }
      );


  return marketResult({

    type:
      "fx",

    name:
      base +
      " / " +
      quote,

    region:
      "Foreign Exchange",

    unit:
      "rate",

    source:
      "Frankfurter",

    observations:
      observations

  });
}


/* =========================================================
   PROVIDER 3
   BANK OF ENGLAND — BANK RATE
========================================================= */

async function getBankOfEnglandRate(
  config,
  from,
  to
) {

  if (
    !PROVIDERS
      .bankOfEngland
      .enabled
  ) {

    throw new Error(
      "Bank of England provider disabled."
    );
  }


  function boeDate(dateString) {

    const months = [
      "Jan", "Feb", "Mar", "Apr",
      "May", "Jun", "Jul", "Aug",
      "Sep", "Oct", "Nov", "Dec"
    ];


    const parts =
      dateString.split("-");


    return (
      parts[2] +
      "/" +
      months[
        Number(parts[1]) - 1
      ] +
      "/" +
      parts[0]
    );
  }


  const endpoint =
    "https://www.bankofengland.co.uk" +
    "/boeapps/database/_iadb-fromshowcolumns.asp" +

    "?csv.x=yes" +

    "&Datefrom=" +
    encodeURIComponent(
      boeDate(from)
    ) +

    "&Dateto=" +
    encodeURIComponent(
      boeDate(to)
    ) +

    "&SeriesCodes=IUDBEDR" +

    "&CSVF=TN" +

    "&UsingCodes=Y" +

    "&VPD=Y" +

    "&VFD=N";


  const response =
    await fetch(
      endpoint,
      {
        headers: {

          "Accept":
            "text/csv,text/plain,*/*",

          "User-Agent":
            "Syvare-Capital-Market-API/4.1"

        }
      }
    );


  if (!response.ok) {

    throw new Error(
      "Bank of England database returned HTTP " +
      response.status +
      "."
    );
  }


  const text =
    await response.text();


  if (!text.trim()) {

    throw new Error(
      "Bank of England returned an empty dataset."
    );
  }


  const rows =
    parseCSV(text);


  const observations = [];


  rows.forEach(
    function (row) {

      const rawDate =
        row.DATE ||
        row.Date ||
        row.date;


      const rawValue =
        row.IUDBEDR;


      if (
        !rawDate ||
        rawValue === undefined ||
        rawValue === null ||
        rawValue === ""
      ) {

        return;
      }


      const parsedDate =
        new Date(
          rawDate + " UTC"
        );


      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {

        return;
      }


      const value =
        Number(rawValue);


      if (
        !Number.isFinite(value)
      ) {

        return;
      }


      const date =
        formatDate(
          parsedDate
        );


      if (
        !insideRange(
          date,
          from,
          to
        )
      ) {

        return;
      }


      observations.push({

        date:
          date,

        value:
          value

      });

    }
  );


  return marketResult({

    type:
      "rate",

    name:
      config.name,

    symbol:
      "IUDBEDR",

    region:
      config.region,

    unit:
      "%",

    currency:
      null,

    source:
      "Bank of England",

    observations:
      observations

  });
}


/* =========================================================
   TREASURY XML HELPER
========================================================= */

function extractXMLValue(
  block,
  field
) {

  const expression =
    new RegExp(

      "<d:" +
      field +
      "[^>]*>([^<]+)<\\/d:" +
      field +
      ">",

      "i"

    );


  const match =
    block.match(
      expression
    );


  return match
    ? match[1]
    : null;
}


/* =========================================================
   PROVIDER 4
   U.S. DEPARTMENT OF THE TREASURY
========================================================= */

async function getUSTreasury(
  config,
  from,
  to
) {

  if (
    !PROVIDERS
      .usTreasury
      .enabled
  ) {

    throw new Error(
      "U.S. Treasury provider disabled."
    );
  }


  const requestedStartYear =
    Number(
      from.slice(0, 4)
    );


  const requestedEndYear =
    Number(
      to.slice(0, 4)
    );


  const startYear =
    Math.max(
      1990,
      requestedStartYear
    );


  const currentYear =
    new Date()
      .getUTCFullYear();


  const endYear =
    Math.min(
      requestedEndYear,
      currentYear
    );


  if (
    startYear >
    endYear
  ) {

    throw new Error(
      "Treasury yield data is available from 1990."
    );
  }


  const requests = [];


  for (
    let year = startYear;
    year <= endYear;
    year += 1
  ) {

    const endpoint =
      "https://home.treasury.gov" +
      "/resource-center/data-chart-center/interest-rates/pages/xml" +

      "?data=daily_treasury_yield_curve" +

      "&field_tdr_date_value=" +
      year;


    requests.push(

      fetch(endpoint)
        .then(
          async function (
            response
          ) {

            if (
              !response.ok
            ) {

              return "";
            }


            return response.text();

          }
        )

    );
  }


  const XMLDocuments =
    await Promise.all(
      requests
    );


  const observations = [];


  XMLDocuments.forEach(
    function (xml) {

      if (!xml) {

        return;
      }


      const entryPattern =
        /<entry>([\s\S]*?)<\/entry>/gi;


      let entry;


      while (
        (
          entry =
            entryPattern.exec(xml)
        ) !== null
      ) {

        const block =
          entry[1];


        const rawDate =
          extractXMLValue(
            block,
            "NEW_DATE"
          );


        const rawValue =
          extractXMLValue(
            block,
            config.treasuryField
          );


        if (
          !rawDate ||
          rawValue === null
        ) {

          continue;
        }


        const parsedDate =
          new Date(
            rawDate
          );


        if (
          Number.isNaN(
            parsedDate.getTime()
          )
        ) {

          continue;
        }


        const date =
          formatDate(
            parsedDate
          );


        const value =
          Number(
            rawValue
          );


        if (
          !Number.isFinite(value)
        ) {

          continue;
        }


        if (
          !insideRange(
            date,
            from,
            to
          )
        ) {

          continue;
        }


        observations.push({

          date:
            date,

          value:
            value

        });
      }

    }
  );


  return marketResult({

    type:
      "rate",

    name:
      config.name,

    region:
      config.region,

    unit:
      "%",

    source:
      "U.S. Department of the Treasury",

    observations:
      observations

  });
}


/* =========================================================
   EQUITY PROVIDER ROUTING
========================================================= */

async function loadEquity(
  config,
  from,
  to
) {

  const errors = [];


  for (
    const provider of
      config.providers
  ) {

    try {

      if (
        provider ===
        "yahoo"
      ) {

        return await getYahooEquity(
          config,
          from,
          to
        );
      }


      throw new Error(
        "Unknown equity provider: " +
        provider
      );


    } catch (error) {

      errors.push(

        provider +
        ": " +
        error.message

      );
    }
  }


  throw new Error(

    "All equity providers failed. " +
    errors.join(" | ")

  );
}


/* =========================================================
   RATE PROVIDER ROUTING
========================================================= */

async function loadRate(
  config,
  from,
  to
) {

  const errors = [];


  for (
    const provider of
      config.providers
  ) {

    try {

      if (
        provider ===
        "bankOfEngland"
      ) {

        return await getBankOfEnglandRate(
          config,
          from,
          to
        );
      }


      if (
        provider ===
        "usTreasury"
      ) {

        return await getUSTreasury(
          config,
          from,
          to
        );
      }


      throw new Error(
        "Unknown rates provider: " +
        provider
      );


    } catch (error) {

      errors.push(

        provider +
        ": " +
        error.message

      );
    }
  }


  throw new Error(

    "All rate providers failed. " +
    errors.join(" | ")

  );
}


/* =========================================================
   DATE RANGE VALIDATION
========================================================= */

function validateRange(
  from,
  to
) {

  if (
    !isValidDateString(from) ||
    !isValidDateString(to)
  ) {

    throw new Error(
      "A valid from and to date are required. Dates must use YYYY-MM-DD."
    );
  }


  if (
    Number.isNaN(
      parseDate(from).getTime()
    ) ||
    Number.isNaN(
      parseDate(to).getTime()
    )
  ) {

    throw new Error(
      "Invalid date."
    );
  }


  if (
    parseDate(from) >
    parseDate(to)
  ) {

    throw new Error(
      "Start date must be before end date."
    );
  }
}


/* =========================================================
   WORKER ROUTER
========================================================= */

export default {

  async fetch(request) {


    /* =====================================================
       CORS PREFLIGHT
    ===================================================== */

    if (
      request.method ===
      "OPTIONS"
    ) {

      return new Response(

        null,

        {
          status: 204,
          headers:
            CORS_HEADERS
        }

      );
    }


    /* =====================================================
       ONLY GET
    ===================================================== */

    if (
      request.method !==
      "GET"
    ) {

      return jsonResponse(

        {
          error:
            "Only GET requests are supported."
        },

        405

      );
    }


    const url =
      new URL(
        request.url
      );


    /* =====================================================
       HEALTH CHECK
    ===================================================== */

    if (
      url.pathname ===
      "/" ||
      url.pathname ===
      "/health"
    ) {

      return jsonResponse({

        status:
          "ok",

        service:
          "Syvaré Capital Market API",

        version:
          "4.1",

        providers: {

          equities:
            "Yahoo Finance",

          fx:
            "Frankfurter",

          ukRates:
            "Bank of England",

          usRates:
            "U.S. Department of the Treasury"

        },

        instruments: {

          equities: [
            "ftse100",
            "ftse250",
            "sp500",
            "nasdaq"
          ],

          rates: [
            "uk-bank-rate",
            "us-2y",
            "us-10y"
          ]

        }

      });
    }


    /* =====================================================
       MARKET ENDPOINT
    ===================================================== */

    if (
      url.pathname !==
      "/market"
    ) {

      return jsonResponse(

        {
          error:
            "Endpoint not found."
        },

        404

      );
    }


    try {


      const type =
        String(
          url.searchParams.get(
            "type"
          ) || ""
        ).toLowerCase();


      const from =
        url.searchParams.get(
          "from"
        );


      const to =
        url.searchParams.get(
          "to"
        );


      validateRange(
        from,
        to
      );


      /* ===================================================
         FX
      =================================================== */

      if (
        type ===
        "fx"
      ) {

        const base =
          String(
            url.searchParams.get(
              "base"
            ) || ""
          ).toUpperCase();


        const quote =
          String(
            url.searchParams.get(
              "quote"
            ) || ""
          ).toUpperCase();


        if (
          !base ||
          !quote
        ) {

          throw new Error(
            "Base and quote currencies are required."
          );
        }


        if (
          !/^[A-Z]{3}$/.test(base) ||
          !/^[A-Z]{3}$/.test(quote)
        ) {

          throw new Error(
            "Currencies must use three-letter ISO codes."
          );
        }


        return jsonResponse(

          await getFrankfurterFX(
            base,
            quote,
            from,
            to
          )

        );
      }


      /* ===================================================
         EQUITIES
      =================================================== */

      if (
        type ===
        "equity"
      ) {

        const symbol =
          String(
            url.searchParams.get(
              "symbol"
            ) || ""
          ).toLowerCase();


        const config =
          MARKET_CONFIG
            .equities[
              symbol
            ];


        if (!config) {

          throw new Error(
            "Unknown equity instrument."
          );
        }


        return jsonResponse(

          await loadEquity(
            config,
            from,
            to
          )

        );
      }


      /* ===================================================
         INTEREST RATES
      =================================================== */

      if (
        type ===
        "rate"
      ) {

        const symbol =
          String(
            url.searchParams.get(
              "symbol"
            ) || ""
          ).toLowerCase();


        const config =
          MARKET_CONFIG
            .rates[
              symbol
            ];


        if (!config) {

          throw new Error(
            "Unknown interest-rate instrument."
          );
        }


        return jsonResponse(

          await loadRate(
            config,
            from,
            to
          )

        );
      }


      throw new Error(
        "Unknown market type."
      );


    } catch (error) {


      console.error(

        "Market API error:",

        error

      );


      return jsonResponse(

        {
          error:
            error.message ||
            "Market data unavailable."
        },

        502

      );
    }
  }

};
