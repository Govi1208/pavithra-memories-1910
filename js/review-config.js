// Review settings. Edit this file; nothing else needs to change.
window.REVIEW_CONFIG = {
  // The review opens WhatsApp (wa.me click-to-chat) addressed to this number; she taps Send herself.
  // Country code + number, digits only.
  whatsappNumber: '916385409299',
  // If the encoded link would be longer than this, nothing is cut: she is told and offered a copy instead.
  maxUrlLength: 8000,
  minMessageLength: 300,
  maxMessageLength: 2000,
  overallRating: 10,
  personalMessage: "Ellamay ennaku romba romba romba romba romba pudichi eruku 🫶 Thank you so much thangooooo ✨ Ennaka ka evalo efforts eduthu eruku ❤️ Athula onnu kuda nalla ah ella ah nu sollavey mudiyathu 💓 Ellamay avalo nalla ah eruku da 😘 Ennaku ethu nalla ah erukum nu pathu pathu vangi eruka 🫶 Na ethana time thank u sonnalum serious ah pathathu ❤️ ennala etha Eppaiumay marakavey mudiyathu thangooooooooo ✨ love u so much 😘 love you more and more da 😘",

  // The 20 gifts, in order. To show real photographs, put the files in images/gifts/ and list
  // them here, e.g.  photos: ['images/gifts/01-body-wash.jpg']  (one or two per gift).
  // A gift with no photos (or a photo that fails to load) shows a placeholder.
  gifts: [
    { name: 'Haircut', rating: 10, comment: "Entha rating unnoda hair cut ku 😘", photos: ['images/gifts/01-hair-cut.jpeg'] },
    { name: 'Stencils + Mehendi', rating: 9, comment: "Super ah eruku thangoooo ✨ thankyou da 😊", photos: ['images/gifts/02-stencils-mehendi.jpg'] },
    { name: 'Personal Photo Website', rating: 10, comment: "It's my top most fav da 😘 entha website ah create pandrathu Evalo kasta patta nu ennaku nallavey therium 🫶 antha photos Ellam just photos mattum ella ah ,antha oru oru photo kullaium neriya memories eruku athu ellathaium onnum create panni thanthathuku romba thanks da 💙", photos: ['images/gifts/03-photo-website-qr.jpg'] },
    { name: 'Two Photo Frames', rating: 10, comment: "😘😘😘😘😘 unnakey nalla ah therium antha photo ennaku evalo pudikum nu , ennaku romba pudicha photo frame pootu thanthathuku romba thanks da ya nu la theriyala serious antha photo ennaku romba pudikum ennaku pudichi paiyan kuda edutha photo athu romba special thana 🥰🥰🥰", photos: ['images/gifts/04-photo-frames-1.jpg', 'images/gifts/04-photo-frames-2.jpg'] },
    { name: 'Husky Soft Toy', rating: 9, comment: "Super ah eruku thangoooo 💓 Thank you so much ❤️ alaga soft ah eruku 😊", photos: ['images/gifts/05-husky-soft-toy.jpg'] },
    { name: 'Maroon Maxi Dress', rating: 10, comment: "Ethum ennoda fav 😘 first entha dress pakkum bothu ennaku nalla erukathu nu nenachitu eruntha but poodum bothu serious ennaku romba nalla ah erunthuchi avalo alaga eruntha super comfort ah erunthuchi 💓 it's more comfortable to me 🤗 thank you so much da 😘", photos: ['images/gifts/06-maroon-dress-1.jpg', 'images/gifts/06-maroon-dress-2.jpg'] },
    { name: 'Two Pairs of Jhumkas', rating: 9, comment: "Rendu earings um romba nalla ah eruku da ❤️ ennaku kuda eppadi select panna ah theriyathu , antha earings ah pakkum bothey theriuthu evalau pathu pathu select panni eruka nu 🫶 romba thanks da 💙", photos: ['images/gifts/07-jhumkas-1.jpg', 'images/gifts/07-jhumkas-2.jpg'] },
    { name: 'Bracelet', rating: 9, comment: "Ethum super ah eruku ❤️ antha 5 heart vanthathu romba nalla ah eruku da 🫶", photos: ['images/gifts/08-bracelet.jpg'] },
    { name: 'Milton 1L Water Bottle', rating: 10, comment: "Water bottle um ennaku romba pudichi eruku ❤️ unnala tha na neriya thannium kudikuran entha water bottle pakkum bothu la thanni kudikanum nu thonum 💓 Thanks da chello 🫶", photos: ['images/gifts/09-water-bottle.jpg'] },
    { name: 'Stationery Items', rating: 9, comment: "Ennaku ethu ellamay pudichi eruku🫶 Ellamay use pandran 💓 Thank you da 😘", photos: ['images/gifts/10-stationery.jpg'] },
    { name: 'Face Towel / Kerchief', rating: 9, comment: "Kerchief romba super ah eruku da 🫶 soft ah comfort ah eruku ❤️", photos: ['images/gifts/11-face-towel.jpg'] },
    { name: 'Formal Belt', rating: 10, comment: "Belt um nalla ah eruku ❤️ na sonnathu marakama vangi thanthathuku romba Thanks da thangoooo 💓", photos: ['images/gifts/12-formal-belt.jpg'] },
    { name: 'Pearl Floral Tiara / Hair Clip', rating: 9, comment: "Rendumay romba alaga eruku da 🫶romba thanks thangoooo 💓", photos: ['images/gifts/13-hair-clip-tiara.jpg', 'images/gifts/13-hair-clip-tiara-2.jpg?v=2'] },
    { name: 'Dried Rose Flower', rating: 10, comment: "Antha rose evalau alaga eruku theriuma ❤️ ennaku yarum eppadi flower thanthathu ella ah 🫶 nee tha first romba super ah eruku ❤️", photos: ['images/gifts/14-dried-rose.jpg'] },
    { name: 'Evil Eye Keychain', rating: 10, comment: "Ethum ennoda fav 😘 Pathu batharama vechikiran da 💓", photos: ['images/gifts/15-evil-eye-keychain.jpg'] },
    { name: 'MCaffeine Body Wash', rating: 10, comment: "Body wash na except pannathu vida romba super ah eruku ❤️ thankyou so much thangooooo 😘", photos: ['images/gifts/16-mcaffeine-body-wash.jpg'] },
    { name: 'Ferrero Rocher', rating: 10, comment: "Ennaku entha chocolate pudikum 💓 nalla ah erunthuchi 🫶 thankyou da 😊", photos: ['images/gifts/17-ferrero-rocher.jpg'] },
    { name: 'Candle Sets', rating: 9, comment: "Rendumay nalla ah eruku ❤️ thankyou chello 🫶", photos: ['images/gifts/18-candle-sets.jpg', 'images/gifts/18-candle-sets-2.jpg?v=2'] },
    { name: 'Fastrack Black Sling Bag', rating: 10, comment: "Ethum ennoda top most fav da 😘 ennaku romba pudichi eruku ❤️ thankyou so much thangooooo ✨", photos: ['images/gifts/19-fastrack-sling-bag.jpg'] },
    { name: 'Black Platform Sandals', rating: 10, comment: "Ethuku 10 rating la suthama pathathu ❤️ ennoda top most no 1 fav ethu tha evalo pudichi eruku 🫶 na Eppadi except pannano appadia eruku ❤️ sema comfort ah eruku ❤️ thankyou so much thangooooo ✨", photos: ['images/gifts/20-black-platform-sandals.jpg'] }
  ]
};
