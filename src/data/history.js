// Real Madrid CF — historical honours data.
// All facts are real: years, opponents, scores and venues of every final.

export const UCL_FINALS = [
  {
    year: 1956, edition: "1st European Cup", opponent: "Stade de Reims", score: "4–3",
    venue: "Parc des Princes, Paris",
    note: "Real Madrid win the very first European Cup, coming back twice with Di Stéfano and Rial leading the charge.",
  },
  {
    year: 1957, edition: "European Cup", opponent: "Fiorentina", score: "2–0",
    venue: "Santiago Bernabéu, Madrid",
    note: "The only European final won at home — Di Stéfano and Gento seal the second consecutive crown.",
  },
  {
    year: 1958, edition: "European Cup", opponent: "AC Milan", score: "3–2 a.e.t.",
    venue: "Heysel Stadium, Brussels",
    note: "Gento strikes in extra time to complete the hat-trick of European titles.",
  },
  {
    year: 1959, edition: "European Cup", opponent: "Stade de Reims", score: "2–0",
    venue: "Neckarstadion, Stuttgart",
    note: "Four in a row. Di Stéfano and Mateos score as Madrid dominate Europe's founding era.",
  },
  {
    year: 1960, edition: "European Cup", opponent: "Eintracht Frankfurt", score: "7–3",
    venue: "Hampden Park, Glasgow",
    note: "The greatest final ever played: Puskás scores four, Di Stéfano three, before 127,000 spectators.",
  },
  {
    year: 1966, edition: "European Cup", opponent: "Partizan Belgrade", score: "2–1",
    venue: "Heysel Stadium, Brussels",
    note: "The 'Ye-yé' generation — Amancio and Serena complete the comeback for La Sexta.",
  },
  {
    year: 1998, edition: "UEFA Champions League", opponent: "Juventus", score: "1–0",
    venue: "Amsterdam Arena, Amsterdam",
    note: "Mijatović ends a 32-year wait — La Séptima returns the European Cup to Madrid.",
  },
  {
    year: 2000, edition: "UEFA Champions League", opponent: "Valencia", score: "3–0",
    venue: "Stade de France, Paris",
    note: "Morientes, McManaman and Raúl's famous slalom goal seal La Octava in the first all-Spanish final.",
  },
  {
    year: 2002, edition: "UEFA Champions League", opponent: "Bayer Leverkusen", score: "2–1",
    venue: "Hampden Park, Glasgow",
    note: "Zidane's left-foot volley — arguably the greatest final goal ever — wins La Novena in the centenary year.",
  },
  {
    year: 2014, edition: "UEFA Champions League", opponent: "Atlético Madrid", score: "4–1 a.e.t.",
    venue: "Estádio da Luz, Lisbon",
    note: "Ramos' 93rd-minute header forces extra time; Bale, Marcelo and Cristiano complete La Décima.",
  },
  {
    year: 2016, edition: "UEFA Champions League", opponent: "Atlético Madrid", score: "1–1 a.e.t. (5–3 p)",
    venue: "San Siro, Milan",
    note: "La Undécima is decided on penalties — Cristiano Ronaldo converts the winning spot-kick.",
  },
  {
    year: 2017, edition: "UEFA Champions League", opponent: "Juventus", score: "4–1",
    venue: "Millennium Stadium, Cardiff",
    note: "Cristiano scores twice as Madrid become the first club to retain the Champions League — La Duodécima.",
  },
  {
    year: 2018, edition: "UEFA Champions League", opponent: "Liverpool", score: "3–1",
    venue: "NSC Olimpiyskiy, Kyiv",
    note: "Bale's bicycle kick headlines three in a row — La Decimotercera, an unprecedented modern dynasty.",
  },
  {
    year: 2022, edition: "UEFA Champions League", opponent: "Liverpool", score: "1–0",
    venue: "Stade de France, Paris",
    note: "Vinícius Júnior scores and Courtois delivers a final for the ages. La Decimocuarta.",
  },
  {
    year: 2024, edition: "UEFA Champions League", opponent: "Borussia Dortmund", score: "2–0",
    venue: "Wembley Stadium, London",
    note: "Carvajal and Vinícius strike late at Wembley — La Decimoquinta, fifteenth European crown.",
  },
];

export const BALLON_DOR = [
  {
    player: "Alfredo Di Stéfano", years: [1957, 1959], img: "distefano",
    role: "Forward · Argentina / Spain, 1953–1964",
    note: "La Saeta Rubia — the architect of five consecutive European Cups and the club's first Ballon d'Or winner.",
  },
  {
    player: "Raymond Kopa", years: [1958], img: "kopa",
    role: "Attacking midfielder · France, 1956–1959",
    note: "The napkin-footed French genius who orchestrated the great Di Stéfano-era side.",
  },
  {
    player: "Luís Figo", years: [2000], img: "figo",
    role: "Winger · Portugal, 2000–2005",
    note: "The signing that launched the Galáctico era, crowned with the 2000 Ballon d'Or.",
  },
  {
    player: "Ronaldo", years: [2002], img: "ronaldo9",
    role: "Striker · Brazil, 2002–2007",
    note: "O Fenômeno — arrived at the Bernabéu weeks before lifting the 2002 Ballon d'Or after his World Cup triumph.",
  },
  {
    player: "Fabio Cannavaro", years: [2006], img: "cannavaro",
    role: "Defender · Italy, 2006–2009",
    note: "Italy's World Cup-winning captain rewarded with the Ballon d'Or months after joining Madrid.",
  },
  {
    player: "Cristiano Ronaldo", years: [2013, 2014, 2016, 2017], img: "cr7",
    role: "Forward · Portugal, 2009–2018",
    note: "The club's all-time top scorer (450 goals). Four Ballon d'Ors in white — the statue in the east wing is his.",
  },
  {
    player: "Luka Modrić", years: [2018], img: "modric",
    role: "Midfielder · Croatia, 2012–present",
    note: "In 2018 he broke a decade of Messi–Ronaldo dominance after a World Cup final with Croatia.",
  },
  {
    player: "Karim Benzema", years: [2022], img: "benzema",
    role: "Striker · France, 2009–2023",
    note: "A historic 2021–22 season — 44 goals and a 14th European Cup — crowned with the 2022 Ballon d'Or.",
  },
];

export const LA_LIGA = {
  name: "La Liga",
  count: 36,
  blurb: "Record 36 Spanish league championships — including two historic runs of five consecutive titles (1961–65, 1986–90).",
  years: [
    "1931–32", "1932–33", "1953–54", "1954–55", "1956–57", "1957–58",
    "1960–61", "1961–62", "1962–63", "1963–64", "1964–65", "1966–67",
    "1967–68", "1968–69", "1971–72", "1974–75", "1975–76", "1977–78",
    "1978–79", "1979–80", "1985–86", "1986–87", "1987–88", "1988–89",
    "1989–90", "1994–95", "1996–97", "2000–01", "2002–03", "2006–07",
    "2007–08", "2011–12", "2016–17", "2019–20", "2021–22", "2023–24",
  ],
};

export const COPA_DEL_REY = {
  name: "Copa del Rey",
  count: 20,
  blurb: "Twenty King's Cups — from the four-in-a-row of 1905–1908 to the 2023 triumph over Osasuna at La Cartuja.",
  years: [
    "1905", "1906", "1907", "1908", "1917", "1934", "1936", "1946",
    "1947", "1961–62", "1969–70", "1973–74", "1974–75", "1979–80",
    "1981–82", "1988–89", "1992–93", "2010–11", "2013–14", "2022–23",
  ],
};

export const SUPERCOPA = {
  name: "Supercopa de España",
  count: 13,
  blurb: "Thirteen Spanish Super Cups, the traditional curtain-raiser between the league champion and cup winner.",
  years: [
    "1988", "1989", "1990", "1993", "1997", "2001", "2003", "2008",
    "2012", "2017", "2019–20", "2021–22", "2023–24",
  ],
};
