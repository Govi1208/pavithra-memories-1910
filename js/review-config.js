// Review settings. Edit this file; nothing else needs to change.
window.REVIEW_CONFIG = {
  // The review opens WhatsApp (wa.me click-to-chat) addressed to this number; she taps Send herself.
  // Country code + number, digits only.
  whatsappNumber: '916385409299',
  // If the encoded link would be longer than this, nothing is cut: she is told and offered a copy instead.
  maxUrlLength: 8000,
  minMessageLength: 300,
  maxMessageLength: 2000,

  // The 20 gifts, in order. To show real photographs, put the files in images/gifts/ and list
  // them here, e.g.  photos: ['images/gifts/01-body-wash.jpg']  (one or two per gift).
  // A gift with no photos (or a photo that fails to load) shows a placeholder.
  gifts: [
    { name: 'Handwritten Love Letter', photos: [] },
    { name: 'Stencils + Mehendi', photos: ['images/gifts/02-stencils-mehendi.jpg'] },
    { name: 'Personal Photo Website', photos: [] },
    { name: 'Two Photo Frames (QR code on one)', photos: [] },
    { name: 'Husky Soft Toy', photos: ['images/gifts/05-husky-soft-toy.jpg'] },
    { name: 'Maroon Maxi Dress', photos: [] },
    { name: 'Two Pairs of Jhumkas', photos: ['images/gifts/07-jhumkas-1.jpg', 'images/gifts/07-jhumkas-2.jpg'] },
    { name: 'Bracelet', photos: [] },
    { name: 'Milton 1L Water Bottle', photos: [] },
    { name: 'Stationery Items', photos: [] },
    { name: 'Face Towel / Kerchief', photos: [] },
    { name: 'Formal Belt', photos: ['images/gifts/12-formal-belt.jpg'] },
    { name: 'Pearl Floral Tiara / Hair Clip', photos: [] },
    { name: 'Dried Rose Flower', photos: [] },
    { name: 'Evil Eye Keychain', photos: ['images/gifts/15-evil-eye-keychain.jpg'] },
    { name: 'MCaffeine Body Wash', photos: [] },
    { name: 'Ferrero Rocher', photos: ['images/gifts/17-ferrero-rocher.jpg'] },
    { name: 'Candle Sets', photos: ['images/gifts/18-candle-sets.jpg'] },
    { name: 'Fastrack Black Sling Bag', photos: ['images/gifts/19-fastrack-sling-bag.jpg'] },
    { name: 'Black Platform Sandals', photos: ['images/gifts/20-black-platform-sandals.jpg'] }
  ]
};
