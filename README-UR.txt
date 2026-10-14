LOVEPDFI.COM — UPDATED SITE PACKAGE
====================================

کیا تبدیل کیا گیا ہے:
1) تمام HTML صفحات میں پرانی ڈومین کے canonical، og:url اور structured-data URLs کو https://lovepdfi.com سے بدل دیا گیا ہے۔
2) sitemap.xml اور robots.txt کو نئی ڈومین کے مطابق اپ ڈیٹ کیا گیا ہے۔
3) آپ کے AdSense publisher ID (ca-pub-4193915390669921) کا اسکرپٹ ہر HTML صفحے کے <head> میں شامل کیا گیا ہے۔
4) public/ads.txt شامل کیا گیا ہے۔
5) src/index.js شامل کیا گیا ہے جو پرانی workers.dev ڈومین سے آنے والی ہر درخواست کو اسی path اور query کے ساتھ نئی ڈومین پر HTTP 301 redirect کرتا ہے۔
6) wrangler.jsonc کو Worker + Static Assets کے لیے اپ ڈیٹ کیا گیا ہے۔

DEPLOY کرنے سے پہلے:
- اس ZIP کی بیک اپ کاپی رکھیں۔
- Cloudflare میں درست اکاؤنٹ/پروجیکٹ منتخب کریں۔
- نئی ڈومین lovepdfi.com اسی Worker کے ساتھ Custom Domain کے طور پر منسلک ہو۔
- Wrangler CLI سے پروجیکٹ فولڈر میں `npx wrangler deploy` چلائیں، یا Cloudflare Dashboard کے مطابق deploy کریں۔
- Deploy کے بعد یہ دونوں URLs چیک کریں:
  https://easytools.easytoolssupport.workers.dev/merge-pdf
  https://lovepdfi.com/merge-pdf
  پہلے URL کو دوسرے URL پر 301 کے ساتھ جانا چاہیے، اور path برقرار رہنا چاہیے۔
- AdSense میں lovepdfi.com کو اپنے اکاؤنٹ میں شامل/درخواست دیں اور سائٹ کی منظوری کا انتظار کریں۔ اسکرپٹ لگانے سے منظوری یا اشتہارات دکھنے کی ضمانت نہیں ہے۔
- AdSense کی ads.txt ہدایات اپنے اکاؤنٹ میں بھی چیک کریں۔ یہاں publisher ID کی معیاری ads.txt لائن شامل ہے۔

SEO کے بعد کے مراحل:
- Google Search Console میں https://lovepdfi.com/ پراپرٹی verify کریں۔
- https://lovepdfi.com/sitemap.xml جمع کریں۔
- چند اہم URLs پر URL Inspection کریں۔
- نئی سائٹ پر internal links اور canonical URLs نئی ڈومین پر ہونے چاہئیں۔
- پرانی workers.dev پراپرٹی کے لیے Change of Address عموماً دستیاب نہیں ہوتا، کیونکہ یہ مشترکہ workers.dev ڈومین ہے؛ 301 redirects اور نئی sitemap استعمال کریں۔

نوٹ:
یہ پیکج آپ کے اپ لوڈ کردہ ZIP کی بنیاد پر تبدیل کیا گیا ہے۔ Deploy کرنے سے پہلے اپنی موجودہ live site کا backup رکھیں اور Cloudflare کے domain/Worker settings چیک کریں۔


برانڈ نام کی اپ ڈیٹ:
- قابلِ ترمیم ٹیکسٹ فائلوں میں EasyTools/Easy Tool کے نام کو LovePDFi/lovepdfi سے تبدیل کیا گیا ہے۔
- Deploy کے بعد ہوم پیج، ٹول صفحات، browser tab titles، SEO metadata اور UI میں نام خود چیک کریں۔
- تصاویر/لوگو کے اندر لکھا ہوا متن اگر تصویر کی صورت میں موجود ہے تو وہ خودکار طور پر تبدیل نہیں ہوا؛ اس کے لیے نیا لوگو یا تصویری assets الگ اپ ڈیٹ کرنا ہوں گے۔


برانڈ اپ ڈیٹ کی اضافی تصدیق: HTML صفحوں کے لوگو میں دکھائی دینے والا EasyTools متن بھی LovePDFi سے بدل دیا گیا ہے۔
