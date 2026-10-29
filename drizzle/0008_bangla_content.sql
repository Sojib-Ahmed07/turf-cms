-- drizzle/0008_bangla_content.sql
-- Data only (no schema change). From 29 Oct the whole site is in Bangla.
-- 1. The Contact menu link is removed (the WhatsApp button replaces it).
DELETE FROM "nav_items" WHERE "href" = '/#visit';--> statement-breakpoint
-- 2. Sample content from the seed (and the old English defaults) that is still unchanged in the database becomes
--    Bangla. Only exact matches change: anything the admin wrote themselves stays as it is (edit it in the admin panel).
--    en/bn = plain text columns, je/jb = the same texts as JSON strings (for JSON columns: home sections, contact, SEO).
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN SELECT * FROM (VALUES
    ('Home', 'হোম', '"Home"', '"হোম"'),
    ('Book a slot', 'স্লট বুক করুন', '"Book a slot"', '"স্লট বুক করুন"'),
    ('Grounds', 'মাঠ', '"Grounds"', '"মাঠ"'),
    ('Book now', 'এখনই বুক করুন', '"Book now"', '"এখনই বুক করুন"'),
    ('Floodlit football in Mirpur 12', 'মিরপুর ১২-তে ফ্লাডলাইটের আলোয় ফুটবল', '"Floodlit football in Mirpur 12"', '"মিরপুর ১২-তে ফ্লাডলাইটের আলোয় ফুটবল"'),
    ('Mirpur 12, Dhaka 1216', 'মিরপুর ১২, ঢাকা ১২১৬', '"Mirpur 12, Dhaka 1216"', '"মিরপুর ১২, ঢাকা ১২১৬"'),
    ('6:00 am to 3:00 am, every day', 'প্রতিদিন, সকাল ৬টা থেকে রাত ৩টা', '"6:00 am to 3:00 am, every day"', '"প্রতিদিন, সকাল ৬টা থেকে রাত ৩টা"'),
    ('TurfZone — Book a floodlit ground in Mirpur 12', 'টার্ফজোন — মিরপুর ১২-তে ফ্লাডলাইট মাঠ বুক করুন', '"TurfZone — Book a floodlit ground in Mirpur 12"', '"টার্ফজোন — মিরপুর ১২-তে ফ্লাডলাইট মাঠ বুক করুন"'),
    ('Pick a ground, choose your time, pay online. Three grounds open 6 am to 3 am in Mirpur 12, Dhaka.', 'মাঠ সিলেক্ট করুন, সময় সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন। মিরপুর ১২, ঢাকায় তিনটি মাঠ, খোলা সকাল ৬টা থেকে রাত ৩টা।', '"Pick a ground, choose your time, pay online. Three grounds open 6 am to 3 am in Mirpur 12, Dhaka."', '"মাঠ সিলেক্ট করুন, সময় সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন। মিরপুর ১২, ঢাকায় তিনটি মাঠ, খোলা সকাল ৬টা থেকে রাত ৩টা।"'),
    ('Grounds open today', 'আজ খালি মাঠ', '"Grounds open today"', '"আজ খালি মাঠ"'),
    ('Live availability for today. Tap a time to jump straight into booking.', 'আজ কোন মাঠে কখন খালি আছে, এখানেই দেখুন। একটি সময়ে চাপ দিলেই বুকিং শুরু।', '"Live availability for today. Tap a time to jump straight into booking."', '"আজ কোন মাঠে কখন খালি আছে, এখানেই দেখুন। একটি সময়ে চাপ দিলেই বুকিং শুরু।"'),
    ('Three grounds, all floodlit, all bookable by the block.', 'তিনটি মাঠ, সবগুলোতে ফ্লাডলাইট। প্রতিটি স্লট আলাদা করে বুক করা যায়।', '"Three grounds, all floodlit, all bookable by the block."', '"তিনটি মাঠ, সবগুলোতে ফ্লাডলাইট। প্রতিটি স্লট আলাদা করে বুক করা যায়।"'),
    ('Book in three steps', 'তিন ধাপে বুকিং', '"Book in three steps"', '"তিন ধাপে বুকিং"'),
    ('Book in three taps', 'তিন ধাপে বুকিং', '"Book in three taps"', '"তিন ধাপে বুকিং"'),
    ('Pick a slot', 'স্লট সিলেক্ট করুন', '"Pick a slot"', '"স্লট সিলেক্ট করুন"'),
    ('Choose the ground, the date and a free time. Prices are shown up front.', 'মাঠ, তারিখ আর খালি সময় সিলেক্ট করুন। দাম আগেই দেখানো থাকে।', '"Choose the ground, the date and a free time. Prices are shown up front."', '"মাঠ, তারিখ আর খালি সময় সিলেক্ট করুন। দাম আগেই দেখানো থাকে।"'),
    ('Pay online', 'অনলাইনে পেমেন্ট করুন', '"Pay online"', '"অনলাইনে পেমেন্ট করুন"'),
    ('bKash, card, Nagad or Rocket. Press Pay and go straight to the payment page; the slot is yours once it goes through.', 'বিকাশ, কার্ড, নগদ বা রকেট। পেমেন্ট হয়ে গেলেই স্লটটি আপনার।', '"bKash, card, Nagad or Rocket. Press Pay and go straight to the payment page; the slot is yours once it goes through."', '"বিকাশ, কার্ড, নগদ বা রকেট। পেমেন্ট হয়ে গেলেই স্লটটি আপনার।"'),
    ('Show up and play', 'মাঠে এসে খেলুন', '"Show up and play"', '"মাঠে এসে খেলুন"'),
    ('Your ticket lands in My bookings. Show it at the gate.', 'টিকিট পাবেন "আমার বুকিং"-এ। গেটে টিকিটটি দেখালেই হবে।', '"Your ticket lands in My bookings. Show it at the gate."', '"টিকিট পাবেন \"আমার বুকিং\"-এ। গেটে টিকিটটি দেখালেই হবে।"'),
    ('Pick a ground', 'মাঠ সিলেক্ট করুন', '"Pick a ground"', '"মাঠ সিলেক্ট করুন"'),
    ('Choose the surface and the format you want to play.', 'কোন মাঠে, কত জনের খেলা খেলবেন সিলেক্ট করুন।', '"Choose the surface and the format you want to play."', '"কোন মাঠে, কত জনের খেলা খেলবেন সিলেক্ট করুন।"'),
    ('Choose your time', 'সময় সিলেক্ট করুন', '"Choose your time"', '"সময় সিলেক্ট করুন"'),
    ('Live availability. Booked slots are greyed out.', 'কোন সময় খালি, সরাসরি দেখুন। বুক হয়ে যাওয়া স্লট ধূসর থাকে।', '"Live availability. Booked slots are greyed out."', '"কোন সময় খালি, সরাসরি দেখুন। বুক হয়ে যাওয়া স্লট ধূসর থাকে।"'),
    ('Card, bKash, Nagad or Rocket through SSLCommerz.', 'কার্ড, বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন।', '"Card, bKash, Nagad or Rocket through SSLCommerz."', '"কার্ড, বিকাশ, নগদ বা রকেট দিয়ে পেমেন্ট করুন।"'),
    ('Find us', 'আমাদের ঠিকানা', '"Find us"', '"আমাদের ঠিকানা"'),
    ('We are five minutes from Mirpur 12 roundabout, with parking on site.', 'মিরপুর ১২ গোলচত্বর থেকে মাত্র পাঁচ মিনিট। ভেতরেই গাড়ি রাখার জায়গা আছে।', '"We are five minutes from Mirpur 12 roundabout, with parking on site."', '"মিরপুর ১২ গোলচত্বর থেকে মাত্র পাঁচ মিনিট। ভেতরেই গাড়ি রাখার জায়গা আছে।"'),
    ('Changing rooms', 'চেঞ্জিং রুম', '"Changing rooms"', '"চেঞ্জিং রুম"'),
    ('Floodlights', 'ফ্লাডলাইট', '"Floodlights"', '"ফ্লাডলাইট"'),
    ('Drinking water', 'খাবার পানি', '"Drinking water"', '"খাবার পানি"'),
    ('Free parking', 'ফ্রি পার্কিং', '"Free parking"', '"ফ্রি পার্কিং"'),
    ('Pitch A', 'পিচ এ', '"Pitch A"', '"পিচ এ"'),
    ('Pitch B', 'পিচ বি', '"Pitch B"', '"পিচ বি"'),
    ('Box Cricket', 'বক্স ক্রিকেট', '"Box Cricket"', '"বক্স ক্রিকেট"'),
    ('Our main 5-a-side ground with a fresh 40 mm turf.', 'নতুন ৪০ মিমি টার্ফের আমাদের প্রধান মাঠ, ৫ জন করে খেলার জন্য।', '"Our main 5-a-side ground with a fresh 40 mm turf."', '"নতুন ৪০ মিমি টার্ফের আমাদের প্রধান মাঠ, ৫ জন করে খেলার জন্য।"'),
    ('Wider 7-a-side ground, best for weekend leagues.', 'বড় মাঠ, ৭ জন করে খেলার জন্য। ছুটির দিনের লিগের জন্য সেরা।', '"Wider 7-a-side ground, best for weekend leagues."', '"বড় মাঠ, ৭ জন করে খেলার জন্য। ছুটির দিনের লিগের জন্য সেরা।"'),
    ('Net-enclosed box cricket for six-a-side games.', 'নেট দিয়ে ঘেরা বক্স ক্রিকেট, ৬ জন করে খেলার জন্য।', '"Net-enclosed box cricket for six-a-side games."', '"নেট দিয়ে ঘেরা বক্স ক্রিকেট, ৬ জন করে খেলার জন্য।"'),
    ('5-a-side', '৫ জন করে', '"5-a-side"', '"৫ জন করে"'),
    ('6-a-side', '৬ জন করে', '"6-a-side"', '"৬ জন করে"'),
    ('7-a-side', '৭ জন করে', '"7-a-side"', '"৭ জন করে"'),
    ('40 × 20 m', '৪০ × ২০ মিটার', '"40 × 20 m"', '"৪০ × ২০ মিটার"'),
    ('50 × 30 m', '৫০ × ৩০ মিটার', '"50 × 30 m"', '"৫০ × ৩০ মিটার"'),
    ('30 × 15 m', '৩০ × ১৫ মিটার', '"30 × 15 m"', '"৩০ × ১৫ মিটার"'),
    ('Indoor, 40 mm turf', 'ইনডোর, ৪০ মিমি টার্ফ', '"Indoor, 40 mm turf"', '"ইনডোর, ৪০ মিমি টার্ফ"'),
    ('Outdoor, 50 mm turf', 'আউটডোর, ৫০ মিমি টার্ফ', '"Outdoor, 50 mm turf"', '"আউটডোর, ৫০ মিমি টার্ফ"'),
    ('Indoor matting', 'ইনডোর ম্যাট', '"Indoor matting"', '"ইনডোর ম্যাট"'),
    ('Floodlit football turf at night', 'রাতে ফ্লাডলাইটের আলোয় ফুটবল মাঠ', '"Floodlit football turf at night"', '"রাতে ফ্লাডলাইটের আলোয় ফুটবল মাঠ"'),
    ('Open till 3 am', 'রাত ৩টা পর্যন্ত খোলা', '"Open till 3 am"', '"রাত ৩টা পর্যন্ত খোলা"'),
    ('Your game starts when the lights come on', 'আলো জ্বললেই শুরু আপনার খেলা', '"Your game starts when the lights come on"', '"আলো জ্বললেই শুরু আপনার খেলা"'),
    ('Floodlit turf in Mirpur 12. Pick a slot, pay online, and walk straight onto the pitch.', 'মিরপুর ১২-তে ফ্লাডলাইটের টার্ফ। স্লট সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন, সোজা মাঠে নেমে পড়ুন।', '"Floodlit turf in Mirpur 12. Pick a slot, pay online, and walk straight onto the pitch."', '"মিরপুর ১২-তে ফ্লাডলাইটের টার্ফ। স্লট সিলেক্ট করুন, অনলাইনে পেমেন্ট করুন, সোজা মাঠে নেমে পড়ুন।"'),
    ('Aerial view of a lit football field', 'ওপর থেকে দেখা আলো জ্বলা ফুটবল মাঠ', '"Aerial view of a lit football field"', '"ওপর থেকে দেখা আলো জ্বলা ফুটবল মাঠ"'),
    ('More room to run on Pitch B', 'পিচ বি-তে দৌড়ানোর জায়গা বেশি', '"More room to run on Pitch B"', '"পিচ বি-তে দৌড়ানোর জায়গা বেশি"'),
    ('A wider ground for weekend leagues, with LED floodlights.', 'ছুটির দিনের লিগের জন্য বড় মাঠ, এলইডি ফ্লাডলাইটসহ।', '"A wider ground for weekend leagues, with LED floodlights."', '"ছুটির দিনের লিগের জন্য বড় মাঠ, এলইডি ফ্লাডলাইটসহ।"'),
    ('See evening slots', 'সন্ধ্যার স্লট দেখুন', '"See evening slots"', '"সন্ধ্যার স্লট দেখুন"'),
    ('Football resting on green turf', 'সবুজ টার্ফে রাখা ফুটবল', '"Football resting on green turf"', '"সবুজ টার্ফে রাখা ফুটবল"'),
    ('Morning slots', 'সকালের স্লট', '"Morning slots"', '"সকালের স্লট"'),
    ('Beat the heat with a 6 am kickoff', 'গরমের আগে সকাল ৬টায় খেলা শুরু', '"Beat the heat with a 6 am kickoff"', '"গরমের আগে সকাল ৬টায় খেলা শুরু"'),
    ('Morning slots are the cheapest of the day.', 'সারা দিনের মধ্যে সকালের স্লটের দাম সবচেয়ে কম।', '"Morning slots are the cheapest of the day."', '"সারা দিনের মধ্যে সকালের স্লটের দাম সবচেয়ে কম।"'),
    ('See morning slots', 'সকালের স্লট দেখুন', '"See morning slots"', '"সকালের স্লট দেখুন"'),
    ('Weekend nights are 20% off', 'ছুটির দিনের রাতে ২০% ছাড়', '"Weekend nights are 20% off"', '"ছুটির দিনের রাতে ২০% ছাড়"'),
    ('20% off', '২০% ছাড়', '"20% off"', '"২০% ছাড়"'),
    ('Friday and Saturday after 9 pm', 'শুক্র ও শনিবার রাত ৯টার পর', '"Friday and Saturday after 9 pm"', '"শুক্র ও শনিবার রাত ৯টার পর"'),
    ('Bring the squad for late games and save on every slot. Use the code below at checkout.', 'দল নিয়ে রাতে খেলতে আসুন, প্রতিটি স্লটে টাকা বাঁচান। পেমেন্টের সময় নিচের কোডটি দিন।', '"Bring the squad for late games and save on every slot. Use the code below at checkout."', '"দল নিয়ে রাতে খেলতে আসুন, প্রতিটি স্লটে টাকা বাঁচান। পেমেন্টের সময় নিচের কোডটি দিন।"'),
    ('Book a night slot', 'রাতের স্লট বুক করুন', '"Book a night slot"', '"রাতের স্লট বুক করুন"'),
    ('Tournament', 'টুর্নামেন্ট', '"Tournament"', '"টুর্নামেন্ট"'),
    ('Mirpur 5-a-side Cup is coming', 'আসছে মিরপুর ফাইভ-এ-সাইড কাপ', '"Mirpur 5-a-side Cup is coming"', '"আসছে মিরপুর ফাইভ-এ-সাইড কাপ"'),
    ('16 teams, one weekend. Call the desk to register your team.', '১৬টি দল, এক সপ্তাহান্তে খেলা। দলের নাম দিতে কাউন্টারে ফোন করুন।', '"16 teams, one weekend. Call the desk to register your team."', '"১৬টি দল, এক সপ্তাহান্তে খেলা। দলের নাম দিতে কাউন্টারে ফোন করুন।"'),
    ('Call the desk', 'কাউন্টারে ফোন করুন', '"Call the desk"', '"কাউন্টারে ফোন করুন"'),
    ('First booking', 'প্রথম বুকিং', '"First booking"', '"প্রথম বুকিং"'),
    ('৳200 off your first game', 'প্রথম খেলায় ৳২০০ ছাড়', '"৳200 off your first game"', '"প্রথম খেলায় ৳২০০ ছাড়"'),
    ('Create an account and use the code at checkout. One use per player.', 'অ্যাকাউন্ট খুলুন আর পেমেন্টের সময় কোডটি দিন। প্রতিজন একবারই ব্যবহার করতে পারবেন।', '"Create an account and use the code at checkout. One use per player."', '"অ্যাকাউন্ট খুলুন আর পেমেন্টের সময় কোডটি দিন। প্রতিজন একবারই ব্যবহার করতে পারবেন।"'),
    ('Book my first slot', 'প্রথম স্লট বুক করুন', '"Book my first slot"', '"প্রথম স্লট বুক করুন"'),
    ('Booking terms', 'বুকিংয়ের নিয়ম', '"Booking terms"', '"বুকিংয়ের নিয়ম"'),
    ('Please read these before you book. By paying for a slot you agree to them.', 'বুক করার আগে নিয়মগুলো পড়ে নিন। কোনো স্লটের পেমেন্ট করলে ধরে নেওয়া হবে আপনি এই নিয়মগুলো মেনে নিয়েছেন।', '"Please read these before you book. By paying for a slot you agree to them."', '"বুক করার আগে নিয়মগুলো পড়ে নিন। কোনো স্লটের পেমেন্ট করলে ধরে নেওয়া হবে আপনি এই নিয়মগুলো মেনে নিয়েছেন।"'),
    ('Booking and payment', 'বুকিং ও পেমেন্ট', '"Booking and payment"', '"বুকিং ও পেমেন্ট"'),
    ('A booking is confirmed only when your online payment goes through. Slots aren''t reserved: while you are on the payment page nobody else can pay for the same slot (up to 5 minutes with bKash, 10 with card or other wallet). If you cancel, the payment fails or the time runs out, the slot is free for other players again.', 'অনলাইনে পেমেন্ট হয়ে গেলেই কেবল বুকিং কনফার্ম হয়। আগে থেকে স্লট ধরে রাখা হয় না: আপনি পেমেন্ট পেজে থাকার সময় অন্য কেউ ওই স্লটের পেমেন্ট করতে পারবেন না (বিকাশে ৫ মিনিট, কার্ড বা অন্য ওয়ালেটে ১০ মিনিট পর্যন্ত)। পেমেন্ট ক্যানসেল করলে, ফেইল হলে বা সময় শেষ হলে স্লটটি আবার সবার জন্য খালি হয়ে যায়।', '"A booking is confirmed only when your online payment goes through. Slots aren''t reserved: while you are on the payment page nobody else can pay for the same slot (up to 5 minutes with bKash, 10 with card or other wallet). If you cancel, the payment fails or the time runs out, the slot is free for other players again."', '"অনলাইনে পেমেন্ট হয়ে গেলেই কেবল বুকিং কনফার্ম হয়। আগে থেকে স্লট ধরে রাখা হয় না: আপনি পেমেন্ট পেজে থাকার সময় অন্য কেউ ওই স্লটের পেমেন্ট করতে পারবেন না (বিকাশে ৫ মিনিট, কার্ড বা অন্য ওয়ালেটে ১০ মিনিট পর্যন্ত)। পেমেন্ট ক্যানসেল করলে, ফেইল হলে বা সময় শেষ হলে স্লটটি আবার সবার জন্য খালি হয়ে যায়।"'),
    ('Prices', 'দাম', '"Prices"', '"দাম"'),
    ('Prices are per slot, in Taka, and include floodlights and the changing room. The total shown at checkout is what you pay.', 'দাম প্রতি স্লটের, টাকায়। ফ্লাডলাইট আর চেঞ্জিং রুমের খরচ দামের মধ্যেই ধরা আছে। পেমেন্টের সময় যে মোট টাকা দেখানো হয়, সেটাই দিতে হবে।', '"Prices are per slot, in Taka, and include floodlights and the changing room. The total shown at checkout is what you pay."', '"দাম প্রতি স্লটের, টাকায়। ফ্লাডলাইট আর চেঞ্জিং রুমের খরচ দামের মধ্যেই ধরা আছে। পেমেন্টের সময় যে মোট টাকা দেখানো হয়, সেটাই দিতে হবে।"'),
    ('Promo codes', 'প্রোমো কোড', '"Promo codes"', '"প্রোমো কোড"'),
    ('One code per booking. Each code has its own limits (dates, times, grounds and number of uses) and can''t be exchanged for cash.', 'একটি বুকিংয়ে একটি কোড ব্যবহার করা যায়। প্রতিটি কোডের নিজস্ব নিয়ম আছে (তারিখ, সময়, মাঠ আর কতবার ব্যবহার করা যাবে)। কোডের বদলে নগদ টাকা দেওয়া হয় না।', '"One code per booking. Each code has its own limits (dates, times, grounds and number of uses) and can''t be exchanged for cash."', '"একটি বুকিংয়ে একটি কোড ব্যবহার করা যায়। প্রতিটি কোডের নিজস্ব নিয়ম আছে (তারিখ, সময়, মাঠ আর কতবার ব্যবহার করা যাবে)। কোডের বদলে নগদ টাকা দেওয়া হয় না।"'),
    ('Cancelling or moving a booking', 'বুকিং ক্যানসেল বা বদলানো', '"Cancelling or moving a booking"', '"বুকিং ক্যানসেল বা বদলানো"'),
    ('You can release a slot whose payment you left open from My bookings. To cancel or move a paid booking, call us at least 24 hours before your slot.', 'যে স্লটের পেমেন্ট শেষ করেননি, সেটি "আমার বুকিং" থেকে ছেড়ে দিতে পারেন। পেমেন্ট হয়ে যাওয়া বুকিং ক্যানসেল করতে বা বদলাতে খেলার অন্তত ২৪ ঘণ্টা আগে কাউন্টারে ফোন করুন।', '"You can release a slot whose payment you left open from My bookings. To cancel or move a paid booking, call us at least 24 hours before your slot."', '"যে স্লটের পেমেন্ট শেষ করেননি, সেটি \"আমার বুকিং\" থেকে ছেড়ে দিতে পারেন। পেমেন্ট হয়ে যাওয়া বুকিং ক্যানসেল করতে বা বদলাতে খেলার অন্তত ২৪ ঘণ্টা আগে কাউন্টারে ফোন করুন।"'),
    ('Refunds', 'টাকা ফেরত (রিফান্ড)', '"Refunds"', '"টাকা ফেরত (রিফান্ড)"'),
    ('If you paid but the slot was already taken, or you paid twice for the same booking, we refund the full amount. Refunds go back to the way you paid and can take up to 10 working days to reach you.', 'পেমেন্ট করার পর যদি দেখা যায় স্লটটি আগেই বুক হয়ে গেছে, অথবা একই বুকিংয়ের জন্য দুবার পেমেন্ট হয়েছে, পুরো টাকা ফেরত দেওয়া হবে। যেভাবে পেমেন্ট করেছেন সেখানেই টাকা ফেরত যাবে, এতে ১০ কর্মদিবস পর্যন্ত লাগতে পারে।', '"If you paid but the slot was already taken, or you paid twice for the same booking, we refund the full amount. Refunds go back to the way you paid and can take up to 10 working days to reach you."', '"পেমেন্ট করার পর যদি দেখা যায় স্লটটি আগেই বুক হয়ে গেছে, অথবা একই বুকিংয়ের জন্য দুবার পেমেন্ট হয়েছে, পুরো টাকা ফেরত দেওয়া হবে। যেভাবে পেমেন্ট করেছেন সেখানেই টাকা ফেরত যাবে, এতে ১০ কর্মদিবস পর্যন্ত লাগতে পারে।"'),
    ('On the day', 'খেলার দিন', '"On the day"', '"খেলার দিন"'),
    ('Arrive 10 minutes early and show your ticket at the desk (My bookings, then Show ticket). Slots start and end on time; a late start doesn''t extend your slot.', 'খেলার ১০ মিনিট আগে চলে আসুন এবং কাউন্টারে টিকিট দেখান ("আমার বুকিং", তারপর "টিকিট দেখুন")। স্লট ঠিক সময়ে শুরু ও শেষ হয়; দেরি করে এলে সময় বাড়ানো হয় না।', '"Arrive 10 minutes early and show your ticket at the desk (My bookings, then Show ticket). Slots start and end on time; a late start doesn''t extend your slot."', '"খেলার ১০ মিনিট আগে চলে আসুন এবং কাউন্টারে টিকিট দেখান (\"আমার বুকিং\", তারপর \"টিকিট দেখুন\")। স্লট ঠিক সময়ে শুরু ও শেষ হয়; দেরি করে এলে সময় বাড়ানো হয় না।"'),
    ('If we have to close', 'মাঠ বন্ধ রাখতে হলে', '"If we have to close"', '"মাঠ বন্ধ রাখতে হলে"'),
    ('If a ground has to close (for example for bad weather or repairs), we''ll offer you another slot or a full refund.', 'খারাপ আবহাওয়া বা মেরামতের মতো কারণে মাঠ বন্ধ রাখতে হলে আপনাকে অন্য একটি স্লট দেওয়া হবে, অথবা পুরো টাকা ফেরত দেওয়া হবে।', '"If a ground has to close (for example for bad weather or repairs), we''ll offer you another slot or a full refund."', '"খারাপ আবহাওয়া বা মেরামতের মতো কারণে মাঠ বন্ধ রাখতে হলে আপনাকে অন্য একটি স্লট দেওয়া হবে, অথবা পুরো টাকা ফেরত দেওয়া হবে।"'),
    ('Ground rules', 'মাঠের নিয়ম', '"Ground rules"', '"মাঠের নিয়ম"'),
    ('Turf shoes or trainers only, no metal studs. No smoking or glass on the pitch. Your group is responsible for any damage it causes.', 'শুধু টার্ফ শু বা কেডস পরে খেলা যাবে, লোহার স্টাড চলবে না। মাঠে ধূমপান আর কাচের জিনিস নিষেধ। আপনার দলের কারণে কোনো ক্ষতি হলে তার দায় আপনার দলের।', '"Turf shoes or trainers only, no metal studs. No smoking or glass on the pitch. Your group is responsible for any damage it causes."', '"শুধু টার্ফ শু বা কেডস পরে খেলা যাবে, লোহার স্টাড চলবে না। মাঠে ধূমপান আর কাচের জিনিস নিষেধ। আপনার দলের কারণে কোনো ক্ষতি হলে তার দায় আপনার দলের।"')
    ) AS m(en, bn, je, jb) LOOP
        UPDATE "nav_items" SET "label" = r.bn WHERE "label" = r.en;
        UPDATE "pitches" SET "name" = r.bn WHERE "name" = r.en;
        UPDATE "pitches" SET "description" = r.bn WHERE "description" = r.en;
        UPDATE "pitches" SET "format" = r.bn WHERE "format" = r.en;
        UPDATE "pitches" SET "size" = r.bn WHERE "size" = r.en;
        UPDATE "pitches" SET "surface" = r.bn WHERE "surface" = r.en;
        UPDATE "hero_slides" SET "alt" = r.bn WHERE "alt" = r.en;
        UPDATE "hero_slides" SET "eyebrow" = r.bn WHERE "eyebrow" = r.en;
        UPDATE "hero_slides" SET "heading" = r.bn WHERE "heading" = r.en;
        UPDATE "hero_slides" SET "subheading" = r.bn WHERE "subheading" = r.en;
        UPDATE "hero_slides" SET "cta_label" = r.bn WHERE "cta_label" = r.en;
        UPDATE "promo_banners" SET "badge" = r.bn WHERE "badge" = r.en;
        UPDATE "promo_banners" SET "title" = r.bn WHERE "title" = r.en;
        UPDATE "promo_banners" SET "body" = r.bn WHERE "body" = r.en;
        UPDATE "promo_banners" SET "cta_label" = r.bn WHERE "cta_label" = r.en;
        UPDATE "site_settings" SET "tagline" = r.bn WHERE "tagline" = r.en;
        UPDATE "site_settings" SET "menu_button_label" = r.bn WHERE "menu_button_label" = r.en;
        UPDATE "page_sections" SET "data" = replace("data"::text, r.je, r.jb)::jsonb WHERE strpos("data"::text, r.je) > 0;
        UPDATE "site_settings" SET "contact" = replace("contact"::text, r.je, r.jb)::jsonb WHERE strpos("contact"::text, r.je) > 0;
        UPDATE "site_settings" SET "seo" = replace("seo"::text, r.je, r.jb)::jsonb WHERE strpos("seo"::text, r.je) > 0;
    END LOOP;
END $$;