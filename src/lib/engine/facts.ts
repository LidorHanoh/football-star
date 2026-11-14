import type { TriviaTopic } from "./types";

/**
 * Hand-written football facts for trivia: who scored in a famous game, who won
 * a trophy, who was the manager, when a legend retired, record goal tallies.
 * Each entry: [id, topic, question (en), question (he), 4 answers — the first is right].
 */
type L = [en: string, he: string];
export type Fact = [id: string, topic: TriviaTopic, qEn: string, qHe: string, answers: [L, L, L, L]];

const y = (n: number): L => [String(n), String(n)];

export const FACTS: Fact[] = [
  // --- World Cup -------------------------------------------------------------
  ["wc22hat", "general", "Who scored a hat-trick in the 2022 World Cup final?", "מי כבש שלושער בגמר המונדיאל 2022?", [["Kylian Mbappé", "קיליאן אמבפה"], ["Lionel Messi", "ליונל מסי"], ["Ángel Di María", "אנחל די מריה"], ["Olivier Giroud", "אוליבייה ז'ירו"]]],
  ["wc14win", "general", "Who scored the winning goal in the 2014 World Cup final?", "מי כבש את שער הניצחון בגמר המונדיאל 2014?", [["Mario Götze", "מריו גצה"], ["Thomas Müller", "תומאס מילר"], ["Miroslav Klose", "מירוסלב קלוזה"], ["André Schürrle", "אנדרה שירלה"]]],
  ["wc10win", "general", "Who scored the winning goal in the 2010 World Cup final?", "מי כבש את שער הניצחון בגמר המונדיאל 2010?", [["Andrés Iniesta", "אנדרס אינייסטה"], ["David Villa", "דויד וייה"], ["Xavi", "צ'אבי"], ["Fernando Torres", "פרננדו טורס"]]],
  ["wc06red", "general", "Who was sent off in the 2006 World Cup final?", "מי הורחק בגמר המונדיאל 2006?", [["Zinedine Zidane", "זינדין זידאן"], ["Marco Materazzi", "מרקו מטרצי"], ["Thierry Henry", "תיירי הנרי"], ["Fabio Cannavaro", "פאביו קנבארו"]]],
  ["wc02two", "general", "Who scored both goals in the 2002 World Cup final?", "מי כבש את שני השערים בגמר המונדיאל 2002?", [["Ronaldo (Brazil)", "רונאלדו (ברזיל)"], ["Rivaldo", "ריבאלדו"], ["Ronaldinho", "רונאלדיניו"], ["Roberto Carlos", "רוברטו קרלוס"]]],
  ["wc10champ", "general", "Who won the 2010 World Cup?", "מי זכתה במונדיאל 2010?", [["Spain", "ספרד"], ["Netherlands", "הולנד"], ["Germany", "גרמניה"], ["Brazil", "ברזיל"]]],
  ["wc06champ", "general", "Who won the 2006 World Cup?", "מי זכתה במונדיאל 2006?", [["Italy", "איטליה"], ["France", "צרפת"], ["Germany", "גרמניה"], ["Portugal", "פורטוגל"]]],
  ["wc18champ", "general", "Who won the 2018 World Cup?", "מי זכתה במונדיאל 2018?", [["France", "צרפת"], ["Croatia", "קרואטיה"], ["Belgium", "בלגיה"], ["England", "אנגליה"]]],
  ["wc02champ", "general", "Who won the 2002 World Cup?", "מי זכתה במונדיאל 2002?", [["Brazil", "ברזיל"], ["Germany", "גרמניה"], ["Turkey", "טורקיה"], ["South Korea", "דרום קוריאה"]]],
  ["wc22coach", "general", "Who coached Argentina to the 2022 World Cup title?", "מי אימן את ארגנטינה לזכייה במונדיאל 2022?", [["Lionel Scaloni", "ליונל סקאלוני"], ["Jorge Sampaoli", "חורחה סמפאולי"], ["Diego Maradona", "דייגו מראדונה"], ["Gerardo Martino", "חררדו מרטינו"]]],
  ["wc14coach", "general", "Who coached Germany to the 2014 World Cup title?", "מי אימן את גרמניה לזכייה במונדיאל 2014?", [["Joachim Löw", "יואכים לב"], ["Jürgen Klinsmann", "יורגן קלינסמן"], ["Hansi Flick", "הנזי פליק"], ["Jupp Heynckes", "יופ היינקס"]]],
  ["wc10coach", "general", "Who coached Spain to the 2010 World Cup title?", "מי אימן את ספרד לזכייה במונדיאל 2010?", [["Vicente del Bosque", "ויסנטה דל בוסקה"], ["Luis Aragonés", "לואיס אראגונס"], ["Pep Guardiola", "פפ גווארדיולה"], ["Rafael Benítez", "רפאל בניטס"]]],
  ["wc18coach", "general", "Who coached France to the 2018 World Cup title?", "מי אימן את צרפת לזכייה במונדיאל 2018?", [["Didier Deschamps", "דידייה דשאן"], ["Laurent Blanc", "לורן בלאן"], ["Zinedine Zidane", "זינדין זידאן"], ["Raymond Domenech", "רמון דומנק"]]],
  ["wcKlose", "general", "Who holds the record for most World Cup goals (16)?", "מי מחזיק בשיא השערים במונדיאלים (16)?", [["Miroslav Klose", "מירוסלב קלוזה"], ["Ronaldo (Brazil)", "רונאלדו (ברזיל)"], ["Lionel Messi", "ליונל מסי"], ["Gerd Müller", "גרד מילר"]]],
  ["wcFontaine", "general", "Just Fontaine scored a record 13 goals at a single World Cup. Which one?", "ז'וסט פונטיין כבש שיא של 13 שערים במונדיאל אחד. באיזו שנה?", [y(1958), y(1954), y(1962), y(1970)]],
  // --- Euros -----------------------------------------------------------------
  ["eu16win", "general", "Who scored the winning goal in the Euro 2016 final?", "מי כבש את שער הניצחון בגמר יורו 2016?", [["Eder", "אדר"], ["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Nani", "נאני"], ["Renato Sanches", "רנאטו סאנשס"]]],
  ["eu08win", "general", "Who scored the only goal of the Euro 2008 final?", "מי כבש את השער היחיד בגמר יורו 2008?", [["Fernando Torres", "פרננדו טורס"], ["David Villa", "דויד וייה"], ["Xavi", "צ'אבי"], ["Cesc Fàbregas", "ססק פברגאס"]]],
  ["eu04win", "general", "Who scored Greece's winner in the Euro 2004 final?", "מי כבש את שער הניצחון של יוון בגמר יורו 2004?", [["Angelos Charisteas", "אנגלוס חריסטאס"], ["Theodoros Zagorakis", "תאודורוס זגורקיס"], ["Giorgos Karagounis", "יורגוס קרגוניס"], ["Zisis Vryzas", "זיסיס בריזאס"]]],
  ["eu04champ", "general", "Who won Euro 2004?", "מי זכתה ביורו 2004?", [["Greece", "יוון"], ["Portugal", "פורטוגל"], ["Czech Republic", "צ'כיה"], ["Netherlands", "הולנד"]]],
  ["eu24win", "general", "Who scored Spain's winner in the Euro 2024 final?", "מי כבש את שער הניצחון של ספרד בגמר יורו 2024?", [["Mikel Oyarzabal", "מיקל אויארסבל"], ["Nico Williams", "ניקו וויליאמס"], ["Lamine Yamal", "לאמין ימאל"], ["Dani Olmo", "דני אולמו"]]],
  ["eu20champ", "general", "Who won Euro 2020 (played in 2021)?", "מי זכתה ביורו 2020 (ששוחק ב-2021)?", [["Italy", "איטליה"], ["England", "אנגליה"], ["Spain", "ספרד"], ["Denmark", "דנמרק"]]],
  ["eu16coach", "general", "Who coached Portugal to the Euro 2016 title?", "מי אימן את פורטוגל לזכייה ביורו 2016?", [["Fernando Santos", "פרננדו סנטוש"], ["Paulo Bento", "פאולו בנטו"], ["José Mourinho", "ז'וזה מוריניו"], ["Roberto Martínez", "רוברטו מרטינס"]]],
  ["eu04coach", "general", "Who coached Greece to the Euro 2004 title?", "מי אימן את יוון לזכייה ביורו 2004?", [["Otto Rehhagel", "אוטו רהאגל"], ["Fernando Santos", "פרננדו סנטוש"], ["Berti Vogts", "ברטי פוגטס"], ["Guus Hiddink", "חוס הידינק"]]],
  // --- Ballon d'Or -----------------------------------------------------------
  ["bd18", "general", "Who won the Ballon d'Or in 2018?", "מי זכה בכדור הזהב ב-2018?", [["Luka Modrić", "לוקה מודריץ'"], ["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Antoine Griezmann", "אנטואן גריזמן"], ["Lionel Messi", "ליונל מסי"]]],
  ["bd22", "general", "Who won the Ballon d'Or in 2022?", "מי זכה בכדור הזהב ב-2022?", [["Karim Benzema", "קארים בנזמה"], ["Sadio Mané", "סאדיו מאנה"], ["Kevin De Bruyne", "קווין דה בריינה"], ["Robert Lewandowski", "רוברט לבנדובסקי"]]],
  ["bd24", "general", "Who won the Ballon d'Or in 2024?", "מי זכה בכדור הזהב ב-2024?", [["Rodri", "רודרי"], ["Vinícius Júnior", "ויניסיוס ז'וניור"], ["Jude Bellingham", "ג'וד בלינגהאם"], ["Dani Carvajal", "דני קרבחאל"]]],
  ["bd25", "general", "Who won the Ballon d'Or in 2025?", "מי זכה בכדור הזהב ב-2025?", [["Ousmane Dembélé", "עוסמן דמבלה"], ["Lamine Yamal", "לאמין ימאל"], ["Vitinha", "ויטיניה"], ["Mohamed Salah", "מוחמד סלאח"]]],
  ["bd07", "general", "Who won the Ballon d'Or in 2007?", "מי זכה בכדור הזהב ב-2007?", [["Kaká", "קאקה"], ["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Lionel Messi", "ליונל מסי"], ["Didier Drogba", "דידייה דרוגבה"]]],
  ["bd06", "general", "Who won the Ballon d'Or in 2006?", "מי זכה בכדור הזהב ב-2006?", [["Fabio Cannavaro", "פאביו קנבארו"], ["Gianluigi Buffon", "ג'אנלואיג'י בופון"], ["Thierry Henry", "תיירי הנרי"], ["Ronaldinho", "רונאלדיניו"]]],
  ["bd01", "general", "Who won the Ballon d'Or in 2001?", "מי זכה בכדור הזהב ב-2001?", [["Michael Owen", "מייקל אואן"], ["Raúl", "ראול"], ["Oliver Kahn", "אוליבר קאהן"], ["David Beckham", "דייוויד בקהאם"]]],
  // --- Retirements -----------------------------------------------------------
  ["retZidane", "general", "In which year did Zinedine Zidane retire as a player?", "באיזו שנה פרש זינדין זידאן כשחקן?", [y(2006), y(2004), y(2008), y(2010)]],
  ["retHenry", "general", "In which year did Thierry Henry retire as a player?", "באיזו שנה פרש תיירי הנרי כשחקן?", [y(2014), y(2012), y(2010), y(2016)]],
  ["retXavi", "general", "In which year did Xavi retire as a player?", "באיזו שנה פרש צ'אבי כשחקן?", [y(2019), y(2015), y(2017), y(2021)]],
  ["retRooney", "top5", "In which year did Wayne Rooney retire as a player?", "באיזו שנה פרש וויין רוני כשחקן?", [y(2021), y(2018), y(2019), y(2023)]],
  ["retZlatan", "general", "In which year did Zlatan Ibrahimović retire?", "באיזו שנה פרש זלאטן איברהימוביץ'?", [y(2023), y(2021), y(2022), y(2024)]],
  ["retPique", "top5", "In which year did Gerard Piqué retire?", "באיזו שנה פרש ג'רארד פיקה?", [y(2022), y(2020), y(2021), y(2023)]],
  ["retCasillas", "general", "In which year did Iker Casillas retire?", "באיזו שנה פרש איקר קסיאס?", [y(2020), y(2018), y(2019), y(2022)]],
  ["retMaldini", "top5", "In which year did Paolo Maldini retire?", "באיזו שנה פרש פאולו מלדיני?", [y(2009), y(2007), y(2011), y(2005)]],
  ["retBeckham", "general", "In which year did David Beckham retire?", "באיזו שנה פרש דייוויד בקהאם?", [y(2013), y(2011), y(2012), y(2015)]],
  ["retKroos", "general", "In which year did Toni Kroos retire?", "באיזו שנה פרש טוני קרוס?", [y(2024), y(2022), y(2023), y(2025)]],
  ["retGerrard", "top5", "In which year did Steven Gerrard retire as a player?", "באיזו שנה פרש סטיבן ג'רארד כשחקן?", [y(2016), y(2014), y(2015), y(2018)]],
  ["retIniesta", "general", "In which year did Andrés Iniesta retire?", "באיזו שנה פרש אנדרס אינייסטה?", [y(2024), y(2018), y(2022), y(2025)]],
  ["retBuffon", "general", "In which year did Gianluigi Buffon retire?", "באיזו שנה פרש ג'אנלואיג'י בופון?", [y(2023), y(2021), y(2022), y(2024)]],
  // --- Goals and records -----------------------------------------------------
  ["golShearer", "top5", "How many Premier League goals did Alan Shearer score (the all-time record)?", "כמה שערים כבש אלן שירר בפרמייר ליג (שיא כל הזמנים)?", [y(260), y(213), y(187), y(245)]],
  ["golHaaland", "top5", "How many Premier League goals did Erling Haaland score in 2022/23 (a record)?", "כמה שערים כבש ארלינג הולאנד בפרמייר ליג בעונת 2022/23 (שיא)?", [y(36), y(32), y(34), y(38)]],
  ["golLewy", "top5", "How many Bundesliga goals did Robert Lewandowski score in 2020/21 (a record)?", "כמה שערים כבש רוברט לבנדובסקי בבונדסליגה בעונת 2020/21 (שיא)?", [y(41), y(36), y(40), y(43)]],
  ["golMessi12", "general", "How many goals did Lionel Messi score in the calendar year 2012?", "כמה שערים כבש ליונל מסי בשנת 2012?", [y(91), y(79), y(85), y(96)]],
  ["golMessiBarca", "top5", "How many official goals did Lionel Messi score for Barcelona?", "כמה שערים רשמיים כבש ליונל מסי בברצלונה?", [y(672), y(614), y(701), y(645)]],
  ["golHenry", "top5", "Who is Arsenal's all-time top scorer?", "מי מלך השערים של ארסנל בכל הזמנים?", [["Thierry Henry", "תיירי הנרי"], ["Ian Wright", "איאן רייט"], ["Robin van Persie", "רובין ואן פרסי"], ["Dennis Bergkamp", "דניס ברגקאמפ"]]],
  ["golMuller", "top5", "Who holds the record for most Bundesliga goals?", "מי מחזיק בשיא השערים בבונדסליגה?", [["Gerd Müller", "גרד מילר"], ["Robert Lewandowski", "רוברט לבנדובסקי"], ["Klaus Fischer", "קלאוס פישר"], ["Jupp Heynckes", "יופ היינקס"]]],
  // --- Champions League --------------------------------------------------------
  ["clIstanbul", "cl", "Who scored Liverpool's first goal in the 2005 Champions League final comeback in Istanbul?", "מי כבש את השער הראשון של ליברפול בקאמבק בגמר ליגת האלופות 2005 באיסטנבול?", [["Steven Gerrard", "סטיבן ג'רארד"], ["Xabi Alonso", "צ'אבי אלונסו"], ["Vladimír Šmicer", "ולדימיר שמיצר"], ["Djibril Cissé", "ג'יבריל סיסה"]]],
  ["cl99win", "cl", "Who scored Manchester United's winner in the 1999 Champions League final?", "מי כבש את שער הניצחון של מנצ'סטר יונייטד בגמר ליגת האלופות 1999?", [["Ole Gunnar Solskjær", "אולה גונאר סולשייר"], ["Teddy Sheringham", "טדי שרינגהאם"], ["Dwight Yorke", "דווייט יורק"], ["Andy Cole", "אנדי קול"]]],
  ["cl12drogba", "cl", "Who scored Chelsea's equaliser and the winning penalty in the 2012 Champions League final?", "מי כבש את שער השוויון ואת הפנדל המכריע של צ'לסי בגמר ליגת האלופות 2012?", [["Didier Drogba", "דידייה דרוגבה"], ["Frank Lampard", "פרנק למפארד"], ["Juan Mata", "חואן מאטה"], ["Fernando Torres", "פרננדו טורס"]]],
  ["cl14ramos", "cl", "Who scored Real Madrid's stoppage-time equaliser in the 2014 final against Atlético?", "מי כבש את שער השוויון של ריאל מדריד בתוספת הזמן בגמר 2014 נגד אתלטיקו?", [["Sergio Ramos", "סרחיו ראמוס"], ["Gareth Bale", "גארת' בייל"], ["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Marcelo", "מרסלו"]]],
  ["cl18bale", "cl", "Who scored with a bicycle kick in the 2018 Champions League final?", "מי כבש במספרת בגמר ליגת האלופות 2018?", [["Gareth Bale", "גארת' בייל"], ["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Karim Benzema", "קארים בנזמה"], ["Sadio Mané", "סאדיו מאנה"]]],
  ["cl13robben", "cl", "Who scored Bayern's late winner in the 2013 final against Dortmund?", "מי כבש את שער הניצחון המאוחר של באיירן בגמר 2013 נגד דורטמונד?", [["Arjen Robben", "אריין רובן"], ["Thomas Müller", "תומאס מילר"], ["Mario Mandžukić", "מריו מנדז'וקיץ'"], ["Franck Ribéry", "פרנק ריברי"]]],
  ["cl20coman", "cl", "Who scored the only goal of the 2020 Champions League final?", "מי כבש את השער היחיד בגמר ליגת האלופות 2020?", [["Kingsley Coman", "קינגסלי קומאן"], ["Robert Lewandowski", "רוברט לבנדובסקי"], ["Thomas Müller", "תומאס מילר"], ["Serge Gnabry", "סרז' גנאברי"]]],
  ["cl21havertz", "cl", "Who scored the only goal of the 2021 Champions League final?", "מי כבש את השער היחיד בגמר ליגת האלופות 2021?", [["Kai Havertz", "קאי האברץ"], ["Mason Mount", "מייסון מאונט"], ["Timo Werner", "טימו ורנר"], ["N'Golo Kanté", "נגולו קאנטה"]]],
  ["cl22vini", "cl", "Who scored the only goal of the 2022 Champions League final?", "מי כבש את השער היחיד בגמר ליגת האלופות 2022?", [["Vinícius Júnior", "ויניסיוס ז'וניור"], ["Karim Benzema", "קארים בנזמה"], ["Federico Valverde", "פדריקו ואלוורדה"], ["Rodrygo", "רודריגו"]]],
  ["cl23rodri", "cl", "Who scored the only goal of the 2023 Champions League final?", "מי כבש את השער היחיד בגמר ליגת האלופות 2023?", [["Rodri", "רודרי"], ["Kevin De Bruyne", "קווין דה בריינה"], ["Erling Haaland", "ארלינג הולאנד"], ["Bernardo Silva", "ברנרדו סילבה"]]],
  ["cl10milito", "cl", "Who scored both of Inter's goals in the 2010 Champions League final?", "מי כבש את שני השערים של אינטר בגמר ליגת האלופות 2010?", [["Diego Milito", "דייגו מיליטו"], ["Samuel Eto'o", "סמואל אטו"], ["Wesley Sneijder", "וסלי סניידר"], ["Goran Pandev", "גוראן פנדב"]]],
  ["cl25doue", "cl", "Who scored twice for PSG in the 5–0 win over Inter in the 2025 final?", "מי כבש צמד ל-PSG ב-0:5 על אינטר בגמר 2025?", [["Désiré Doué", "דזירה דואה"], ["Ousmane Dembélé", "עוסמן דמבלה"], ["Khvicha Kvaratskhelia", "חביצ'ה קבארצחליה"], ["Achraf Hakimi", "אשרף חכימי"]]],
  ["cl16pen", "cl", "Who scored the winning penalty in the 2016 Champions League final shoot-out?", "מי כבש את הפנדל המכריע בגמר ליגת האלופות 2016?", [["Cristiano Ronaldo", "כריסטיאנו רונאלדו"], ["Sergio Ramos", "סרחיו ראמוס"], ["Gareth Bale", "גארת' בייל"], ["Marcelo", "מרסלו"]]],
  ["cl05coach", "cl", "Who managed Liverpool to the 2005 Champions League title?", "מי אימן את ליברפול לזכייה בליגת האלופות 2005?", [["Rafael Benítez", "רפאל בניטס"], ["Gérard Houllier", "ז'ראר הולייה"], ["Kenny Dalglish", "קני דלגליש"], ["Roy Hodgson", "רוי הודג'סון"]]],
  ["cl12coach", "cl", "Who managed Chelsea to the 2012 Champions League title?", "מי אימן את צ'לסי לזכייה בליגת האלופות 2012?", [["Roberto Di Matteo", "רוברטו די מתאו"], ["Carlo Ancelotti", "קרלו אנצ'לוטי"], ["José Mourinho", "ז'וזה מוריניו"], ["André Villas-Boas", "אנדרה וילאש בואש"]]],
  ["cl04coach", "cl", "Who managed Porto to the 2004 Champions League title?", "מי אימן את פורטו לזכייה בליגת האלופות 2004?", [["José Mourinho", "ז'וזה מוריניו"], ["André Villas-Boas", "אנדרה וילאש בואש"], ["Fernando Santos", "פרננדו סנטוש"], ["Jesualdo Ferreira", "ז'סואלדו פריירה"]]],
  ["cl19coach", "cl", "Who managed Liverpool to the 2019 Champions League title?", "מי אימן את ליברפול לזכייה בליגת האלופות 2019?", [["Jürgen Klopp", "יורגן קלופ"], ["Rafael Benítez", "רפאל בניטס"], ["Brendan Rodgers", "ברנדן רודג'רס"], ["Arne Slot", "ארנה סלוט"]]],
  ["cl20coach", "cl", "Who managed Bayern to the 2020 Champions League title?", "מי אימן את באיירן לזכייה בליגת האלופות 2020?", [["Hansi Flick", "הנזי פליק"], ["Niko Kovač", "ניקו קובאץ'"], ["Julian Nagelsmann", "יוליאן נאגלסמן"], ["Jupp Heynckes", "יופ היינקס"]]],
  ["cl21coach", "cl", "Who managed Chelsea to the 2021 Champions League title?", "מי אימן את צ'לסי לזכייה בליגת האלופות 2021?", [["Thomas Tuchel", "תומאס טוכל"], ["Frank Lampard", "פרנק למפארד"], ["Antonio Conte", "אנטוניו קונטה"], ["Maurizio Sarri", "מאוריציו סארי"]]],
  ["cl25coach", "cl", "Who managed PSG to the 2025 Champions League title?", "מי אימן את PSG לזכייה בליגת האלופות 2025?", [["Luis Enrique", "לואיס אנריקה"], ["Mauricio Pochettino", "מאוריסיו פוצ'טינו"], ["Thomas Tuchel", "תומאס טוכל"], ["Christophe Galtier", "כריסטוף גלטייה"]]],
  ["cl13coach", "cl", "Who managed Bayern to the 2013 Champions League title?", "מי אימן את באיירן לזכייה בליגת האלופות 2013?", [["Jupp Heynckes", "יופ היינקס"], ["Pep Guardiola", "פפ גווארדיולה"], ["Louis van Gaal", "לואי ואן חאל"], ["Ottmar Hitzfeld", "אוטמר היצפלד"]]],
  ["clMost", "cl", "Which club has won the most European Cups / Champions Leagues?", "איזה מועדון זכה הכי הרבה פעמים בגביע/ליגת האלופות?", [["Real Madrid", "ריאל מדריד"], ["AC Milan", "מילאן"], ["Bayern Munich", "באיירן מינכן"], ["Liverpool", "ליברפול"]]],
  ["clThree", "cl", "Which manager won three Champions Leagues in a row (2016–2018)?", "איזה מאמן זכה בשלוש ליגות אלופות ברציפות (2016–2018)?", [["Zinedine Zidane", "זינדין זידאן"], ["Carlo Ancelotti", "קרלו אנצ'לוטי"], ["Pep Guardiola", "פפ גווארדיולה"], ["Jürgen Klopp", "יורגן קלופ"]]],
  // --- Top 5 leagues -------------------------------------------------------------
  ["plInvincibles", "top5", "Which club went a whole Premier League season unbeaten in 2003/04?", "איזה מועדון סיים עונת פרמייר ליג שלמה בלי הפסד ב-2003/04?", [["Arsenal", "ארסנל"], ["Chelsea", "צ'לסי"], ["Manchester United", "מנצ'סטר יונייטד"], ["Liverpool", "ליברפול"]]],
  ["plLeicester", "top5", "Which club won the 2015/16 Premier League as 5000–1 outsiders?", "איזה מועדון זכה בפרמייר ליג 2015/16 ביחס של 5000 ל-1?", [["Leicester City", "לסטר סיטי"], ["Tottenham", "טוטנהאם"], ["West Ham", "ווסטהאם"], ["Southampton", "סאות'המפטון"]]],
  ["plLeicesterCoach", "top5", "Who managed Leicester City to the 2015/16 Premier League title?", "מי אימן את לסטר סיטי לאליפות הפרמייר ליג 2015/16?", [["Claudio Ranieri", "קלאודיו ראניירי"], ["Nigel Pearson", "נייג'ל פירסון"], ["Brendan Rodgers", "ברנדן רודג'רס"], ["Craig Shakespeare", "קרייג שייקספיר"]]],
  ["plAguero", "top5", "Who scored Manchester City's 93rd-minute title winner against QPR in 2012?", "מי כבש את שער האליפות של מנצ'סטר סיטי בדקה ה-93 נגד QPR ב-2012?", [["Sergio Agüero", "סרחיו אגוארו"], ["Edin Džeko", "אדין דזקו"], ["Carlos Tevez", "קרלוס טבס"], ["David Silva", "דויד סילבה"]]],
  ["plFergie", "top5", "Sir Alex Ferguson managed Manchester United until which year?", "עד איזו שנה אימן סר אלכס פרגוסון את מנצ'סטר יונייטד?", [y(2013), y(2011), y(2012), y(2014)]],
  ["saNapoli", "top5", "Who coached Napoli to the 2022/23 Serie A title?", "מי אימן את נאפולי לאליפות הסרייה א' 2022/23?", [["Luciano Spalletti", "לוצ'אנו ספאלטי"], ["Antonio Conte", "אנטוניו קונטה"], ["Maurizio Sarri", "מאוריציו סארי"], ["Rafael Benítez", "רפאל בניטס"]]],
  ["blLeverkusen", "top5", "Which club won the 2023/24 Bundesliga without losing a game?", "איזה מועדון זכה בבונדסליגה 2023/24 בלי הפסד?", [["Bayer Leverkusen", "באייר לברקוזן"], ["Bayern Munich", "באיירן מינכן"], ["Borussia Dortmund", "בורוסיה דורטמונד"], ["RB Leipzig", "לייפציג"]]],
  ["blXabi", "top5", "Who coached Bayer Leverkusen to their unbeaten 2023/24 title?", "מי אימן את לברקוזן לאליפות ללא הפסד ב-2023/24?", [["Xabi Alonso", "צ'אבי אלונסו"], ["Julian Nagelsmann", "יוליאן נאגלסמן"], ["Thomas Tuchel", "תומאס טוכל"], ["Gerardo Seoane", "חרארדו סאואנה"]]],
  ["llAtleti", "top5", "Who coached Atlético Madrid to the 2013/14 La Liga title?", "מי אימן את אתלטיקו מדריד לאליפות ספרד 2013/14?", [["Diego Simeone", "דייגו סימאונה"], ["Quique Sánchez Flores", "קיקה סאנצ'ס פלורס"], ["Gregorio Manzano", "גרגוריו מנסאנו"], ["Javier Aguirre", "חוויאר אגירה"]]],
  ["saTotti", "top5", "Francesco Totti spent his whole career at which club?", "בכל הקריירה שלו שיחק פרנצ'סקו טוטי במועדון אחד. איזה?", [["Roma", "רומא"], ["Lazio", "לאציו"], ["Juventus", "יובנטוס"], ["AC Milan", "מילאן"]]],
  ["saCalciopoli", "top5", "Which club was relegated to Serie B in 2006 over the Calciopoli scandal?", "איזה מועדון הורד לסרייה ב' ב-2006 בגלל פרשת הקלצ'ופולי?", [["Juventus", "יובנטוס"], ["AC Milan", "מילאן"], ["Lazio", "לאציו"], ["Fiorentina", "פיורנטינה"]]],
  // --- Israel ------------------------------------------------------------------
  ["ilHaifaCl", "israel", "Which Israeli club was the first to reach the Champions League group stage (2002/03)?", "איזו קבוצה ישראלית הייתה הראשונה שהעפילה לשלב הבתים בליגת האלופות (2002/03)?", [["Maccabi Haifa", "מכבי חיפה"], ["Maccabi Tel Aviv", "מכבי תל אביב"], ["Hapoel Tel Aviv", "הפועל תל אביב"], ["Beitar Jerusalem", "בית\"ר ירושלים"]]],
  ["ilHaifaUtd", "israel", "Maccabi Haifa beat Manchester United in the 2002/03 Champions League. What was the score?", "מכבי חיפה ניצחה את מנצ'סטר יונייטד בליגת האלופות 2002/03. מה הייתה התוצאה?", [["3–0", "3:0"], ["2–1", "2:1"], ["1–0", "1:0"], ["3–2", "3:2"]]],
  ["ilWorldCup", "israel", "In which year did Israel play at the World Cup?", "באיזו שנה השתתפה ישראל במונדיאל?", [y(1970), y(1966), y(1974), y(1982)]],
  ["ilAsianCup", "israel", "In which year did Israel win the Asian Cup?", "באיזו שנה זכתה ישראל בגביע אסיה?", [y(1964), y(1956), y(1960), y(1968)]],
  ["ilBenayoun", "israel", "Which Israeli played for Liverpool, Chelsea and Arsenal?", "איזה ישראלי שיחק בליברפול, צ'לסי וארסנל?", [["Yossi Benayoun", "יוסי בניון"], ["Eyal Berkovic", "אייל ברקוביץ'"], ["Tal Ben Haim", "טל בן חיים"], ["Haim Revivo", "חיים רביבו"]]],
  ["ilRosenthal", "israel", "Which Israeli striker played for Liverpool in the early 1990s?", "איזה חלוץ ישראלי שיחק בליברפול בתחילת שנות ה-90?", [["Ronny Rosenthal", "רוני רוזנטל"], ["Eli Ohana", "אלי אוחנה"], ["Mordechai Spiegler", "מרדכי שפיגלר"], ["Eyal Berkovic", "אייל ברקוביץ'"]]],
  ["ilOhana", "israel", "Eli Ohana won the 1988 Cup Winners' Cup with which club?", "עם איזה מועדון זכה אלי אוחנה בגביע המחזיקות 1988?", [["KV Mechelen", "מכלן"], ["Anderlecht", "אנדרלכט"], ["Club Brugge", "קלאב ברוז'"], ["Ajax", "אייאקס"]]],
  ["ilHapoelUefa", "israel", "Hapoel Tel Aviv reached the UEFA Cup quarter-finals in 2002. Who knocked them out?", "הפועל תל אביב הגיעה לרבע גמר גביע אופ\"א ב-2002. מי הדיחה אותה?", [["AC Milan", "מילאן"], ["Inter", "אינטר"], ["Chelsea", "צ'לסי"], ["Parma", "פארמה"]]],
  ["ilSolomon", "israel", "Which Israeli winger joined Tottenham in 2023?", "איזה כנף ישראלי הצטרף לטוטנהאם ב-2023?", [["Manor Solomon", "מנור סולומון"], ["Eran Zahavi", "ערן זהבי"], ["Dor Peretz", "דור פרץ"], ["Oscar Gloukh", "אוסקר גלוך"]]],
  ["ilZahavi", "israel", "Eran Zahavi was the Chinese Super League top scorer with which club?", "ערן זהבי היה מלך השערים של ליגת העל הסינית במדי איזה מועדון?", [["Guangzhou R&F", "גואנגז'ו R&F"], ["Shanghai SIPG", "שנגחאי SIPG"], ["Beijing Guoan", "בייג'ינג גואן"], ["Shandong Luneng", "שאנדונג לונאנג"]]],
  ["ilMtaCl", "israel", "In which season did Maccabi Tel Aviv play Chelsea and Porto in the Champions League group stage?", "באיזו עונה פגשה מכבי תל אביב את צ'לסי ופורטו בשלב הבתים של ליגת האלופות?", [["2015/16", "2015/16"], ["2004/05", "2004/05"], ["2010/11", "2010/11"], ["2022/23", "2022/23"]]],
  ["ilHapoelCl", "israel", "Which of these clubs was in Hapoel Tel Aviv's 2010/11 Champions League group?", "איזו מהקבוצות האלה הייתה בבית של הפועל תל אביב בליגת האלופות 2010/11?", [["Lyon", "ליון"], ["Barcelona", "ברצלונה"], ["Arsenal", "ארסנל"], ["Inter", "אינטר"]]],
];

/** Facts for the chosen topics ("general" also takes a few from the others). */
export function factsFor(topics: TriviaTopic[]) {
  return FACTS.map((f, i) => ({ f, i })).filter(({ f }) => topics.includes(f[1]) || (topics.includes("general") && f[1] !== "israel"));
}
