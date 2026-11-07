/**
 * FAARA.EXE — Central Approved Copy
 * 
 * Source of truth: FAARA_EXE_Final_Build_Blueprint.docx
 * All wording, punctuation, and system replies are preserved exactly as approved.
 * Do not invent or alter personal details.
 */

export const APP_META = {
  title: "FAARA.EXE",
  subtitle: "Birthday Operating System",
  version: "22.0.0",
  formCode: "BD-22",
  protocol: "22",
  age: 22,
  candleNumbers: [2, 2] as const,
} as const;

export const BOOT_GATE_COPY = {
  mainTitle: "FAARA.EXE",
  subtitle: "The Starlight Dream Garden",
  personalMessage: [
    "You said birthdays aren't that exciting anymore.",
    "So… I made you a little something anyway.",
  ] as const,
  entryAction: "Come have a look →",
  skipButton: "Skip",
  initialization: {
    heading: "Waking up the garden…",
    statusLines: [
      "Stars: awake.",
      "Flowers: looking lovely.",
      "Birthday surprises: classified.",
    ] as const,
    finalLine: "The team has been told not to touch anything.",
  },
} as const;

export const OPENING_COPY = {
  eyebrow: "A MESSAGE FROM FAARA.EXE",
  lead: "Oh. You're here.",
  body: "We've been preparing something for you. Unfortunately, the team is slightly incompetent.",
  status: "System Status: Questionable (Obviously)",
  statusState: "questionable" as const, // triggers amber status pill
  choices: {
    letsSee: {
      button: "Let's see",
      response: "Correct choice. Please keep doing that. The team is already very nervous.",
    },
    whoIsWe: {
      button: "Who is 'we'?",
      responseBeats: [
        "The team.",
        "The slightly incompetent one. We covered this.",
        "Please do not ask for names.",
      ] as const,
    },
  },
  continueButton: "Enter Control Room →",
} as const;

export const CONTROL_ROOM_COPY = {
  eyebrow: "A LITTLE PLACE, JUST FOR YOU",
  headline: "I made a few things for you.",
  supportingLine: "Nothing too grand. Just a few little things I wanted you to have.",
  closingLine: "No rush. Have a look around.",
  backButton: "Back to Control Room",
  modules: [
    {
      id: "surprise",
      badge: "Module 01",
      title: "Surprise",
      description: "Something special waiting for you.",
      actionLabel: "Surprise",
    },
    {
      id: "certificate",
      badge: "Module 02",
      title: "Certificate",
      description: "A very official certificate.",
      actionLabel: "Certificate",
    },
    {
      id: "cake",
      badge: "Module 03",
      title: "Cake",
      description: "One little birthday ritual.",
      actionLabel: "Cake",
    },
  ] as const,
} as const;

export const SURPRISE_COPY = {
  detectedAlert: "PERSONALIZED SURPRISE DETECTED.",
  initialChoices: {
    suspicious: {
      button: "That sounds suspicious.",
      response: "Correct instincts. Proceeding anyway.",
    },
    showMe: {
      button: "Show me.",
      response: "Brave. Proceeding.",
    },
  },
  popups: [
    {
      id: "popup-1",
      title: "NOTICE // 01",
      text: "Birthday reminder: today is all about you. We checked. Then the team checked again, just to be sure.",
      closeLabel: "Dismiss",
    },
    {
      id: "popup-2",
      title: "EFFORT LOG // 02",
      lead: "A completely normal amount of effort has gone into this.",
      pauseMs: 1400,
      punchline: "Okay, fine. A lot of effort. Please just enjoy it and do not ask how long it took.",
      closeLabel: "Understood",
    },
    {
      id: "popup-3",
      title: "SYSTEM MEMO // 03",
      text: "Thank you for listening to an unreasonable amount of nonsense.\n\n“You can do it. I’m with you.”",
      initialCloseLabel: "Close",
      dodgedCloseLabel: "Fine. Close.",
    },
    {
      id: "popup-4",
      title: "SUMMARY // 04",
      typingPauseMs: 1200,
      text: "Anyway, no big speech. Aaj ka birthday achhe se guzre.",
      closeLabel: "Back to Control Room",
    },
  ] as const,
} as const;

export const CERTIFICATE_COPY = {
  department: "FAARA.EXE — CERTIFICATION DEPARTMENT",
  formNumber: "Form BD-22 · Birthday Division · Approved by the team (we think)",
  title: "CERTIFICATE OF BEING A GENUINELY LOVELY HUMAN",
  recipientName: "Faara",
  body: "This certificate is presented to Faara for being the kind of person whose presence makes ordinary days a little better. For the laughs, the little moments, the random gossip, and for being unapologetically herself. No further evidence required.",
  qualification: "One of the best people to have around.",
  validity: "Lifetime. No renewal needed.",
  issuedBy: "Someone who thought you deserved to feel special.",
  terms: "By signing, you accept this certificate and agree to have a good birthday. Terms are not negotiable.",
  stamp: "APPROVED. NO APPEALS.",
  actions: {
    signForMe: "Sign for me",
    clear: "Clear",
    download: "Download keepsake",
  },
} as const;

export const CAKE_COPY = {
  title: "A Birthday Surprise",
  candles: [2, 2] as const,
  makeAWish: "Make a wish.",
  blowMicPrompt: "Blow into the microphone.",
  blowButtonFallback: "Blow",
  micDisclaimer: "Audio is analyzed locally for breath and never recorded.",
  cutPrompt: "Drag along the guide to make the first cut.",
  cutSuccess: "And that concludes the most unnecessarily elaborate cake-cutting ceremony in internet history.",
  bridgeStandard: "Before you go, there's one more thing I'd like you to read.",
  bridgeAlternate: "Before you go, there's one more thing I'd like you to read.",
  bridgeButton: "Read my message →",
} as const;

export const FINAL_MESSAGE_COPY = {
  greeting: "Faara,",
  paragraphs: [
    "Before anything else, I just want to say thank you.",
    "Thank you for always listening, especially when I'm worried about something, dealing with a problem, or just have too much going on in my head. You always listen so patiently, and somehow, when you say, “Koi baat nahi, main hoon,” things feel a little easier to deal with.",
    "I don't know if I've ever properly thanked you for that, but I'm genuinely grateful to have you in my life. And honestly, talking to you has a way of making a bad day feel a little better.",
    "For your birthday, I hope you get to experience all the things you've been working towards, all the places you want to see, and all the dreams you've been quietly carrying with you. I hope you achieve everything you're hoping for, and even find yourself somewhere beyond what you once imagined possible.",
    "And more than anything, I hope life gives you plenty of reasons to smile. Not just today, or because it's your birthday, but on ordinary days too. I hope you always have people around you who listen when you need them, who remind you that things will be okay, and who make you feel as cared for as you make others feel.",
    "I made all of this for one very simple reason: I wanted to make you smile. That's genuinely it. I just wanted you to have a little something made especially for you, something that might make your birthday a little more memorable.",
    "So, I hope this made you smile, even if just a little.",
  ] as const,
  signOff: "Happy birthday, Faara. ❤️",
  nextButton: "One last thing…",
} as const;

export const FAKE_CRASH_COPY = {
  windowTitle: "FAARA.EXE has stopped responding",
  logs: [
    "Error: too much birthday emotion detected.",
    "Restarting with unnecessary confidence…",
  ] as const,
  rebootLine: "Okay, bye now. We have made this weird enough.",
  buttons: {
    replayCake: "Replay cake",
    backToControlRoom: "Back to Control Room",
  },
} as const;
