// Edit this file to add / remove news portals.
//   name  : shown to readers as the source credit
//   site  : homepage (used to auto-discover the RSS link if `feeds` fail)
//   feeds : RSS/Atom URLs to try first (can be empty)
//   cat   : default category slug (main-news, politics, economy, society, opinion,
//           world, sports, entertainment, tech)
export const SOURCES = [
  // ---- Nepali ----
  { name: 'अनलाइनखबर',    site: 'https://www.onlinekhabar.com',            feeds: ['https://www.onlinekhabar.com/feed'], cat: 'main-news' },
  { name: 'सेतोपाटी',      site: 'https://www.setopati.com',                feeds: ['https://www.setopati.com/feed'], cat: 'main-news' },
  { name: 'नयाँ पत्रिका',  site: 'https://www.nayapatrikadaily.com',        feeds: [], cat: 'main-news' },
  { name: 'नागरिक न्युज',  site: 'https://nagariknews.nagariknetwork.com',  feeds: [], cat: 'main-news' },
  { name: 'अन्नपूर्ण पोस्ट', site: 'https://annapurnapost.com',             feeds: [], cat: 'main-news' },
  { name: 'कान्तिपुर',     site: 'https://ekantipur.com',                   feeds: [], cat: 'main-news' },
  { name: 'रातोपाटी',      site: 'https://www.ratopati.com',                feeds: ['https://www.ratopati.com/feed'], cat: 'main-news' },
  { name: 'खबरहब',        site: 'https://khabarhub.com',                   feeds: ['https://khabarhub.com/feed'], cat: 'main-news' },
  { name: 'उकेरा',         site: 'https://ukeraa.com',                      feeds: ['https://ukeraa.com/feed'], cat: 'main-news' },

  // ---- English ----
  { name: 'The Kathmandu Post',  site: 'https://kathmandupost.com',                  feeds: ['https://kathmandupost.com/rss'], cat: 'main-news' },
  { name: 'The Himalayan Times', site: 'https://thehimalayantimes.com',              feeds: [], cat: 'main-news' },
  { name: 'My Republica',        site: 'https://myrepublica.nagariknetwork.com',     feeds: [], cat: 'main-news' },
  { name: 'Nepali Times',        site: 'https://nepalitimes.com',                    feeds: [], cat: 'main-news' },
  { name: 'The Rising Nepal',    site: 'https://risingnepaldaily.com',               feeds: [], cat: 'main-news' },
  { name: 'Khabarhub English',   site: 'https://english.khabarhub.com',              feeds: ['https://english.khabarhub.com/feed'], cat: 'main-news' },
  { name: 'Onlinekhabar English',site: 'https://english.onlinekhabar.com',           feeds: ['https://english.onlinekhabar.com/feed'], cat: 'main-news' },

  // ---- Business & Economy ----
  { name: 'Bizmandu',     site: 'https://bizmandu.com',        feeds: ['https://bizmandu.com/feed'], cat: 'economy' },
  { name: 'मेरो लगानी',    site: 'https://merolagani.com',      feeds: [], cat: 'economy' },
  { name: 'अर्थसरोकार',    site: 'https://arthasarokar.com',    feeds: ['https://arthasarokar.com/feed'], cat: 'economy' },
  { name: 'ShareSansar',  site: 'https://www.sharesansar.com', feeds: [], cat: 'economy' },
  { name: 'Fiscal Nepal', site: 'https://fiscalnepal.com',     feeds: ['https://fiscalnepal.com/feed'], cat: 'economy' }
];
