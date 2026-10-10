/*
 * Everything Muskan reads, every code, and where alerts go lives here.
 * Edit this file (on GitHub: open it, tap the pencil, commit) and the site updates in about a minute.
 */
window.MISSION = {
  name: "Muskan",
  from: "Audil",

  // Codes she types. Not case-sensitive; spaces and dashes are ignored.
  codes: {
    laptop: ["2003"],   // big code on the laptop wallpaper in A-21-02
    swing: ["1103"]     // code on the card in the 3A swing (change to the real one)
  },

  // The word the card photo must show. Checked on her phone; after 2 misses she can still continue.
  photoWord: "PIGEON",
  photoMissesBeforeBypass: 2,

  // Alerts and photos go to the free ntfy app (ntfy.sh). Subscribe to this exact topic name.
  ntfy: {
    server: "https://ntfy.sh",
    topic: "muskan-1110-qs3k2db8qymf"
  },

  // PIN for the hidden handler page: open the site link with #handler on the end.
  handlerPin: "1110",

  text: {
    brand: "Operation 11·10",
    selectedTitle: "You have been selected",
    selectedBody: "Muskan, you have been selected to reach a location. The main twist is awaiting you there.",
    selectedNote: "Each stop gives you something that unlocks the next. Keep this page open.",
    acceptButton: "Accept the mission",

    dateTitle: "Identity lock",
    dateBody: "To open your file, enter today's date.",

    laptopTitle: "The Medium Room",
    laptopLocation: "A-21-02 · medium room",
    laptopBody: "Reach A-21-02 and find the medium room. There is a laptop waiting for you. Open it. A big code will appear on the wallpaper.",
    laptopHints: ["The flat is A-21-02, in A block, 21st floor.", "Open the laptop lid. The code is the big number on the screen."],

    swingTitle: "The Swing",
    swingLocation: "Your building · 3A floor",
    swingBody: "Go to the 3A floor of your building. Find the pot-like swing, the red or the blue one. Another code is hiding there.",
    swingHints: ["Look inside the swing, not just around it.", "Check both the red and the blue swing."],

    photoTitle: "Authentication",
    photoBody: "Take a clear photo of the card you found at the swing. The big word on it proves you were there.",

    selfieTitle: "Face check",
    selfieBody: "One last identity check. Take a selfie so we know it's really you.",

    mfloorTitle: "The Gate",
    mfloorLocation: "B block · M floor",
    mfloorBody: "Head to B block and stop at the M floor. Before you step into the lift, tap the button below so we know you're here.",
    mfloorButton: "I'm here",

    liftTitle: "Going Up",
    liftLocation: "B block lift · 8th floor",
    liftBody: "The guard will help you tap the lift card. Press 8. When the doors open on the 8th floor, tap below.",
    liftButton: "I'm on the 8th floor",

    finaleTitle: "Your surprise awaits you",
    finaleBody: "Happy birthday, Muskan. Look up.",

    offlineNotice: "No signal in the lift? That's normal. Your codes are saved on this phone. If the page closes, open the same link again and you'll be right back here."
  }
};
