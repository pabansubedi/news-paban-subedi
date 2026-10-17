import { Category, Post, Advertisement, SiteSettings, Comment } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'cat-politics', name: 'राजनीति', name_en: 'Politics', slug: 'politics', order_index: 1, color: '#dc2626', is_active: true },
  { id: 'cat-economy', name: 'अर्थतन्त्र', name_en: 'Economy', slug: 'economy', order_index: 2, color: '#2563eb', is_active: true },
  { id: 'cat-society', name: 'समाज', name_en: 'Society', slug: 'society', order_index: 3, color: '#059669', is_active: true },
  { id: 'cat-sports', name: 'खेलकुद', name_en: 'Sports', slug: 'sports', order_index: 4, color: '#d97706', is_active: true },
  { id: 'cat-opinion', name: 'विचार', name_en: 'Opinion', slug: 'opinion', order_index: 5, color: '#7c3aed', is_active: true },
  { id: 'cat-entertainment', name: 'मनोरञ्जन', name_en: 'Entertainment', slug: 'entertainment', order_index: 6, color: '#db2777', is_active: true },
  { id: 'cat-tech', name: 'प्रविधि', name_en: 'Tech', slug: 'tech', order_index: 7, color: '#0284c7', is_active: true },
  { id: 'cat-diaspora', name: 'प्रवास', name_en: 'Diaspora', slug: 'diaspora', order_index: 8, color: '#4f46e5', is_active: true },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    title: 'नेपालमा डिजिटल पूर्वाधार र सूचना प्रविधिको विस्तारमा ऐतिहासिक फड्को: ५ लाख युवालाई रोजगारीको अवसर',
    slug: 'nepal-digital-transformation-it-employment-boost',
    excerpt: 'सरकार र निजी क्षेत्रको सहकार्यमा नेपाललाई दक्षिण एसियाकै सूचना प्रविधि हब बनाउने राष्ट्रिय कार्ययोजना स्वीकृत भएको छ।',
    content: `काठमाडौँ — नेपाल सरकारले राष्ट्रिय सूचना प्रविधि रणनीति २०२६ कार्यान्वयनमा ल्याउँदै आगामी पाँच वर्षभित्र पाँच लाख युवालाई प्रत्यक्ष रोजगारी सिर्जना गर्ने महत्त्वाकांक्षी योजना सार्वजनिक गरेको छ।

सञ्चार तथा सूचना प्रविधि मन्त्रालयले आज आयोजना गरेको उच्चस्तरीय सम्मेलनमा प्रधानमन्त्रीले उक्त राष्ट्रिय मार्गचित्रको विमोचन गर्नुभयो। योजना अनुसार देशभर उच्च गतिको अप्टिकल फाइबर नेटवर्क विस्तार गर्ने, कृत्रिम बौद्धिकता (AI) तथा डेटा सेन्टर पार्क स्थापना गर्ने लक्ष्य लिइएको छ।

"नेपालका प्रतिभाशाली युवाहरू स्वदेशमै बसेर विश्वव्यापी प्रविधि बजारमा काम गर्न सक्षम छन्," प्रधानमन्त्रीले भन्नुभयो। "हामीले कर छुट, नीतिगत सहजीकरण र अन्तर्राष्ट्रिय भुक्तानी प्रणालीलाई सहज बनाउने कानुन तुरुन्तै लागु गर्दैछौं।"

उद्योग वाणिज्य महासंघ र नेपाल आईटी एसोसिएसनका प्रतिनिधिहरूले सरकारको यस कदमलाई ऐतिहासिक भन्दै पूर्ण सहयोगको प्रतिबद्धता जनाएका छन्। आईटी निर्यातबाट देशको विदेशी मुद्रा सञ्चितिमा समेत ठूलो योगदान पुग्ने विज्ञहरूको विश्लेषण छ।`,
    featured_image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'काठमाडौंमा आयोजित राष्ट्रिय डिजिटल शिखर सम्मेलन',
    category_id: 'cat-tech',
    author_id: 'user-reporter-1',
    author_name: 'सुनिता शर्मा',
    author_avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 14850,
    is_breaking: true,
    is_featured: true,
    published_at: '2026-10-12T05:30:00Z',
    created_at: '2026-10-12T04:15:00Z',
    updated_at: '2026-10-12T05:30:00Z',
    read_time_mins: 4,
    tags: ['प्रविधि', 'डिजिटल नेपाल', 'रोजगारी', 'काठमाडौँ']
  },
  {
    id: 'post-2',
    title: 'नेपाल राष्ट्र बैंकद्वारा नयाँ मौद्रिक समीक्षा: ब्याजदर घट्दा सेयर बजार र घरजग्गा कारोबारमा उत्साह',
    slug: 'nrb-monetary-policy-review-market-surge',
    excerpt: 'बैंकहरूको कर्जा ब्याजदर एकल विन्दुमा झरेपछि बजारमा तरलता वृद्धि र लगानीकर्तामा उच्च आत्मविश्वास देखिएको छ।',
    content: `काठमाडौँ — नेपाल राष्ट्र बैंकले चालु आर्थिक वर्षको पहिलो त्रैमासिक मौद्रिक नीति समीक्षा सार्वजनिक गर्दै नीतिगत दरमा कटौती गरेको छ।

राष्ट्र बैंकको घोषणासँगै वाणिज्य बैंकहरूले आधार दर (Base Rate) घटाएका छन्। यसले गर्दा उद्योग, व्यापार तथा उत्पादनमूलक क्षेत्रका लागि सस्तो ब्याजदरमा ऋण उपलब्ध हुने भएको छ।

नेप्से परिसूचक आज कारोबारको पहिलो घण्टामै ६५ अंकले बढेर २,८०० विन्दु नजिक पुगेको छ। कुल कारोबार रकम समेत ८ अर्ब नाघेको छ। बैंकरहरूको भनाइ अनुसार बजारमा लगानीयोग्य रकम प्रचुर मात्रामा रहेकाले अब उत्पादन र पूर्वाधार विकासमा पुँजी परिचालन द्रुत गतिमा अघि बढ्नेछ।`,
    featured_image: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'नेपाल राष्ट्र बैंक केन्द्रीय कार्यालय, बालुवाटार',
    category_id: 'cat-economy',
    author_id: 'user-editor-1',
    author_name: 'विक्रम थापा',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 9320,
    is_breaking: false,
    is_featured: true,
    published_at: '2026-10-12T04:00:00Z',
    created_at: '2026-10-12T03:00:00Z',
    updated_at: '2026-10-12T04:00:00Z',
    read_time_mins: 3,
    tags: ['अर्थतन्त्र', 'नेप्से', 'मौद्रिक नीति', 'राष्ट्र बैंक']
  },
  {
    id: 'post-3',
    title: 'नेपाल टी-२० विश्वकप छनोटको फाइनलमा प्रवेश: ऐतिहासिक खेलमा शानदार ५ विकेटको जित',
    slug: 'nepal-cricket-t20-worldcup-qualifier-final-victory',
    excerpt: 'त्रिवि अन्तर्राष्ट्रिय क्रिकेट मैदान कीर्तिपुरमा हजारौं दर्शकको उत्साहबीच नेपालले प्रतिद्वन्द्वीलाई स्तब्ध पार्यो।',
    content: `कीर्तिपुर — त्रिवि क्रिकेट मैदानमा भएको रोमाञ्चक सेमिफाइनल खेलमा नेपालले सशक्त प्रदर्शन गर्दै ५ विकेटको सनसनीपूर्ण जित हासिल गरेको छ।

टस जितेर पहिले ब्याटिङ गरेको विपक्षी टोलीले निर्धारित २० ओभरमा ७ विकेट गुमाउँदै १६८ रन जोडेको थियो। नेपालका बलरहरूले उत्कृष्ट बलिङ गर्दै डेथ ओभरमा विपक्षीलाई दबाबमा राखेका थिए।

जवाफी ब्याटिङमा नेपालले १९.२ ओभरमै ५ विकेट गुमाएर लक्ष्य भेट्टायो। ओपनिङ ब्याट्सम्यानले आक्रामक अर्धशतक प्रहार गर्दै खेललाई नेपालको पक्षमा मोडेका थिए। यस जितसँगै नेपालले आगामी विश्वकपमा आफ्नो स्थान सुरक्षित गरेको छ। मैदानभर रातो र नीलो झण्डा फहराउँदै दर्शकहरूले ऐतिहासिक उत्सव मनाएका छन्।`,
    featured_image: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'त्रिवि क्रिकेट मैदानमा जितपछि नेपाली खेलाडीहरूको उत्सव',
    category_id: 'cat-sports',
    author_id: 'user-reporter-1',
    author_name: 'सुनिता शर्मा',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 18450,
    is_breaking: true,
    is_featured: true,
    published_at: '2026-10-11T16:20:00Z',
    created_at: '2026-10-11T15:00:00Z',
    updated_at: '2026-10-11T16:20:00Z',
    read_time_mins: 3,
    tags: ['खेलकुद', 'क्रिकेट', 'नेपाली टोली', 'कीर्तिपुर']
  },
  {
    id: 'post-4',
    title: 'प्रतिनिधिसभामा सुशासन र भ्रष्टाचार नियन्त्रणसम्बन्धी विधेयकमाथि बृहत् छलफल',
    slug: 'parliament-passes-good-governance-anti-corruption-bill',
    excerpt: 'सार्वजनिक पद धारण गरेका व्यक्तिहरूको सम्पत्ति विवरण सार्वजनिक गर्नुपर्ने कडा प्रावधानसहितको विधेयक अघि बढ्यो।',
    content: `काठमाडौँ — संघीय संसदको प्रतिनिधिसभा बैठकमा आज सुशासन प्रवर्द्धन तथा भ्रष्टाचार नियन्त्रणसम्बन्धी महत्त्वपूर्ण विधेयकमाथि दफावार छलफल भएको छ।

सत्तापक्ष र प्रतिपक्षका सांसदहरूले भ्रष्टाचार नियन्त्रणमा शून्य सहनशीलता अपनाउनुपर्नेमा एकमत जनाएका छन्। विधेयकमा अख्तियार दुरुपयोग अनुसन्धान आयोगलाई थप स्वायत्तता प्रदान गर्ने र बेनामी सम्पत्ति जफत गर्ने कडा व्यवस्था प्रस्ताव गरिएको छ।

सम्बन्धित मन्त्रीले सांसदहरूले उठाएका प्रश्नको जवाफ दिँदै जनताको विश्वास पुनर्स्थापित गर्न कानुनको कठोर कार्यान्वयन गरिने स्पष्ट पार्नुभयो।`,
    featured_image: 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'नयाँ बानेश्वरस्थित संघीय संसद् भवन',
    category_id: 'cat-politics',
    author_id: 'user-editor-1',
    author_name: 'विक्रम थापा',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 6200,
    is_breaking: false,
    is_featured: false,
    published_at: '2026-10-11T11:00:00Z',
    created_at: '2026-10-11T10:00:00Z',
    updated_at: '2026-10-11T11:00:00Z',
    read_time_mins: 4,
    tags: ['राजनीति', 'संसद्', 'सुशासन', 'कानुन']
  },
  {
    id: 'post-5',
    title: 'विचार: नेपालको जलविद्युत र हरित ऊर्जा — क्षेत्रीय समृद्धिको वास्तविक आधारशिला',
    slug: 'opinion-nepal-clean-hydropower-green-economy',
    excerpt: '१० हजार मेगावाट बिजुली छिमेकी देशहरूमा निर्यात गर्ने सम्झौताले नेपालको व्यापार घाटा सन्तुलनमा ल्याउने सुनौलो अवसर दिएको छ।',
    content: `नेपालको पानी, जनताको लगानी केवल नारामा सीमित नभई अब यथार्थमा परिणत भइरहेको छ। हालैका वर्षहरूमा ठूला जलविद्युत आयोजनाहरूको तीव्र निर्माण र प्रसारण लाइनको विस्तारले नेपाललाई ऊर्जा निर्यातक मुलुकका रूपमा स्थापित गरेको छ।

जलविद्युत आयोजनाहरूबाट उत्पादित हरित ऊर्जा भारत र बंगलादेशसम्म निर्यात हुन थालेपछि विदेशी मुद्रा आर्जनको भरपर्दो स्रोत खुलेको छ। यसले देशको जीवाश्म इन्धनप्रतिको परनिर्भरता घटाउँदै कार्बन न्यूनीकरणमा समेत अन्तर्राष्ट्रिय स्तरमै नेतृत्वदायी भूमिका खेलेको छ।

अबको प्रमुख चुनौती भनेको प्रसारण पूर्वाधारको समयमै निर्माण, वित्तीय व्यवस्थापनको पारदर्शिता र स्थानीय समुदायको न्यायोचित हक सुनिश्चित गर्नु हो।`,
    featured_image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'भोटेकोशी नदी किनारमा रहेको जलविद्युत केन्द्र',
    category_id: 'cat-opinion',
    author_id: 'user-admin-1',
    author_name: 'पवन सुवेदी',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 5120,
    is_breaking: false,
    is_featured: false,
    published_at: '2026-10-10T14:30:00Z',
    created_at: '2026-10-10T13:00:00Z',
    updated_at: '2026-10-10T14:30:00Z',
    read_time_mins: 5,
    tags: ['विचार', 'जलविद्युत', 'अर्थतन्त्र', 'हरित ऊर्जा']
  },
  {
    id: 'post-6',
    title: 'पोखरा अन्तर्राष्ट्रिय म्याराथनमा ३५ देशका धावकहरूको सहभागिता: पर्यटन प्रवर्द्धनमा नयाँ ऊर्जा',
    slug: 'pokhara-international-marathon-tourism-revival',
    excerpt: 'माछापुच्छ्रे र अन्नपूर्ण हिमशृंखलाको छायाँमा सम्पन्न म्याराथनले साहसिक खेल पर्यटनमा नयाँ सम्भावना उजागर गर्‍यो।',
    content: `पोखरा — पर्यटकीय नगरी पोखरामा आज सम्पन्न २०औं अन्तर्राष्ट्रिय म्याराथन भव्य रूपमा सम्पन्न भएको छ। प्रतियोगितामा ३५ भन्दा बढी देशका व्यावसायिक धावकसहित १० हजारभन्दा बढी धावकहरूले सहभागिता जनाए।

विदेशी पर्यटकहरूको बाक्लो उपस्थिति र स्थानीय बासिन्दाहरूको न्यानो आतिथ्यताले पोखराको पर्यटन व्यवसायमा ठूलो उत्साह छाएको छ। होटल तथा रेस्टुरेन्ट व्यवसायीहरूका अनुसार म्याराथनका कारण आगामी महिनासम्मका लागि कोठाहरू बुकिङ भइसकेका छन्।`,
    featured_image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'फेवाताल र अन्नपूर्ण हिमशृंखलाको पृष्ठभूमिमा धावकहरू',
    category_id: 'cat-society',
    author_id: 'user-reporter-1',
    author_name: 'सुनिता शर्मा',
    editor_name: 'पवन सुवेदी',
    status: 'published',
    views: 7410,
    is_breaking: false,
    is_featured: false,
    published_at: '2026-10-09T08:00:00Z',
    created_at: '2026-10-09T07:00:00Z',
    updated_at: '2026-10-09T08:00:00Z',
    read_time_mins: 3,
    tags: ['समाज', 'पोखरा', 'पर्यटन', 'म्याराथन']
  },
  // Pending review draft article to demonstrate workflow
  {
    id: 'post-pending-1',
    title: '[समीक्षाधीन] धरान-इटहरी सडक खण्ड ६ लेन विस्तार कार्य अन्तिम चरणमा',
    slug: 'dharan-itahari-six-lane-highway-near-completion',
    excerpt: 'कोशी प्रदेशको लाइफलाइन मानिएको रणनीतिक व्यापारिक मार्ग यसै महिनाभित्र पूर्ण रूपमा सञ्चालनमा आउने।',
    content: `धरान — कोशी प्रदेशको प्रमुख व्यापारिक करिडोर धरान-इटहरी सडक खण्डको ६ लेन स्तरोन्नति कार्य ९५ प्रतिशत सम्पन्न भएको छ।

सडक डिभिजन कार्यालयका अनुसार कालोपत्रे गर्ने काम सकिएको छ भने ट्राफिक लाइट र डिभाइडर सौन्दर्यीकरणको काम जारी छ। यस मार्गले पूर्वी नेपालको व्यापार र आवागमनलाई सहज बनाउने अपेक्षा गरिएको छ।`,
    featured_image: 'https://images.unsplash.com/photo-1545459720-aac8509eb02c?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'सडक निर्माण कार्य',
    category_id: 'cat-society',
    author_id: 'user-reporter-1',
    author_name: 'सुनिता शर्मा',
    status: 'pending',
    views: 0,
    is_breaking: false,
    is_featured: false,
    published_at: null,
    created_at: '2026-10-12T06:00:00Z',
    updated_at: '2026-10-12T06:00:00Z',
    read_time_mins: 2,
    tags: ['विकास', 'सडक', 'कोशी']
  },
  // Draft article
  {
    id: 'post-draft-1',
    title: '[ड्राफ्ट] नेपाली सिनेमा उद्योगको अन्तर्राष्ट्रिय बजारमा बढ्दो साख',
    slug: 'nepali-cinema-global-festivals-draft',
    excerpt: 'अन्तर्राष्ट्रिय फेस्टिभलहरूमा नेपाली मौलिक कथाहरूको प्रशंसा।',
    content: `यस वर्ष दर्जनभन्दा बढी नेपाली फिल्महरूले विश्वका प्रतिष्ठित फिल्म महोत्सवहरूमा अवार्ड हात पारेका छन्। निर्देशकहरूको फरक दृष्टिकोण र मौलिक प्रस्तुतिले विश्व दर्शकसम्म नेपाली कथा पुर्‍याएको छ।`,
    featured_image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=1200&q=80',
    image_caption: 'सिनेमा हल',
    category_id: 'cat-entertainment',
    author_id: 'user-editor-1',
    author_name: 'विक्रम थापा',
    status: 'draft',
    views: 0,
    is_breaking: false,
    is_featured: false,
    published_at: null,
    created_at: '2026-10-12T06:20:00Z',
    updated_at: '2026-10-12T06:20:00Z',
    read_time_mins: 2,
    tags: ['सिनेमा', 'कला']
  }
];

// Empty, inactive placeholders: they only give the admin the 5 slot cards to fill in.
// (Before, fake "Nepal Telecom / Nabil Bank" demo ads were shown to every reader.)
export const INITIAL_ADS: Advertisement[] = (
  ['header_top', 'below_hero', 'sidebar_top', 'in_article', 'sticky_footer'] as const
).map((slot, i) => ({
  id: `ad-${i + 1}`,
  placement_slot: slot,
  title: '',
  image_url: '',
  redirect_url: '',
  is_active: false,
  views_count: 0,
  clicks_count: 0,
  advertiser_name: ''
}));

export const INITIAL_SITE_SETTINGS: SiteSettings = {
  id: 'site-settings-main',
  site_title: 'News Paban Subedi | न्युज पवन सुवेदी',
  tagline: 'सत्य, तथ्य र निष्पक्ष पत्रकारिताको संवाहक',
  subdomain: 'news.pabansubedi.com.np',
  meta_description: 'News Paban Subedi - नेपालको अग्रणी अनलाइन डिजिटल समाचार पोर्टल। ताजा राजनीतिक, आर्थिक, सामाजिक, खेलकुद तथा अन्तर्राष्ट्रिय गतिविधिहरूको भरपर्दो स्रोत।',
  logo_url: '', // will render styled dynamic SVG/branding if empty
  logo_dark_url: '',
  favicon_url: '',
  watermark_url: '',
  contact_email: '', // set it in Admin -> Site settings
  comments_need_approval: false,
  contact_phone: '+977-1-4400000, 9800000000',
  office_address: 'अनामनगर, काठमाडौँ, नेपाल (Anamnagar, Kathmandu)',
  press_council_reg_no: '१२८४/०८०-८१',
  information_dept_reg_no: '३५६२/०८०-८१',
  editor_in_chief: 'पवन सुवेदी (Paban Subedi)',
  facebook_url: 'https://facebook.com',
  twitter_url: 'https://twitter.com',
  youtube_url: 'https://youtube.com',
  breaking_news_ticker: 'ताजा अपडेट: नेपाल राष्ट्र बैंकको नयाँ मौद्रिक समीक्षा सार्वजनिक • नेपाल टी-२० विश्वकप छनोटको फाइनलमा प्रवेश • डिजिटल नेपाल सूचना प्रविधि सम्मेलन सम्पन्न • पोखरा अन्तर्राष्ट्रिय म्याराथनमा ३५ देशका धावक सहभागी • धरान-इटहरी ६ लेन सडक स्तरोन्नति अन्तिम चरणमा',
  is_ticker_active: true,
  ticker_speed: 85,
  allow_comments: true,
  total_visitors: 124850,
  online_visitors: 48
};

export const INITIAL_COMMENTS: Comment[] = [
  {
    id: 'comm-1',
    post_id: 'post-1',
    author_name: 'रमेश अधिकारी',
    content: 'सूचना प्रविधि क्षेत्रमा यस्तो ठोस योजना कार्यान्वयन हुन सके देशबाट युवा पलायन रोक्न धेरै सहयोग पुग्नेछ। राम्रो कदम!',
    created_at: '2026-10-12T05:45:00Z',
    is_approved: true
  },
  {
    id: 'comm-2',
    post_id: 'post-3',
    author_name: 'सुरेश श्रेष्ठ',
    content: 'नेपाली क्रिकेट टोलीलाई हार्दिक बधाई! सम्पूर्ण खेलाडीको मिहिनेतले आज देशलाई विश्व मञ्चमा चिनाएको छ।',
    created_at: '2026-10-11T17:00:00Z',
    is_approved: true
  }
];
