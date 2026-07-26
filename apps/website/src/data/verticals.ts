export type Vertical = {
  slug: string;
  name: string;
  h1: string;
  subhead: string;
  painPoint: string;
  proofPoint: string;
  exampleCall: { caller: string; agent: string }[];
  metaTitle: string;
  metaDescription: string;
};

export const VERTICALS: Vertical[] = [
  {
    slug: "salon",
    name: "Salon & Spa",
    h1: "AI Receptionist for Salons & Spas in India",
    subhead:
      "Never miss a booking again. DeskBuddy answers every salon call 24/7 in Hindi, English & 4 more Indian languages — takes appointments, quotes prices, and confirms on WhatsApp.",
    painPoint:
      "Peak Saturday hours mean 3 out of 10 salon calls go unanswered — that's ₹40,000/month walking to your competitor.",
    proofPoint:
      "Salon owners using DeskBuddy report 32% more bookings within the first month — mostly from calls that used to ring out.",
    exampleCall: [
      { caller: "Kal shaam haircut ke liye slot milega?", agent: "Ji bilkul! Kal shaam 5 baje free hai. Kis naam se book karoon?" },
      { caller: "Priya. Keratin ka charge kya hai?", agent: "Keratin ₹2,499 se start hota hai, Priya ji. Kal 5 baje aapka slot pakka — details WhatsApp par bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Salons in India — Book Appointments 24/7 | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian salons & spas. Answers 24/7 in Hindi + English, books appointments, quotes services, confirms on WhatsApp. Never miss a booking.",
  },
  {
    slug: "clinic",
    name: "Clinic & Dental",
    h1: "AI Receptionist for Clinics, Dentists & Doctors in India",
    subhead:
      "DeskBuddy answers every patient call 24/7, books consultations, handles insurance queries, and reminds patients — so your front desk can focus on the ones already in the waiting room.",
    painPoint:
      "1 in 4 clinic calls happen after hours. Patients who can't reach you book with the clinic next door.",
    proofPoint:
      "Dental clinics using DeskBuddy cut no-shows by 40% with automated WhatsApp reminders after every booking.",
    exampleCall: [
      { caller: "Kal appointment mil sakti hai dentist ke saath?", agent: "Kal 11 baje Dr. Sharma ke saath free slot hai. Aapka naam?" },
      { caller: "Ravi. Root canal ka approximate cost?", agent: "Ravi ji, root canal ₹4,500 se ₹8,000 tak, doctor ke examination ke baad final price. Kal 11 baje slot confirm — WhatsApp par details bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Clinics & Dentists in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian clinics, dentists & doctors. Books consults, sends WhatsApp reminders, handles insurance queries — 24/7 in Hindi & English.",
  },
  {
    slug: "restaurant",
    name: "Restaurant & Catering",
    h1: "AI Receptionist for Restaurants & Catering in India",
    subhead:
      "DeskBuddy answers reservation and catering enquiries 24/7 — even during dinner rush. Quotes menu prices, takes bookings, and passes leads to your team on WhatsApp.",
    painPoint:
      "Friday 8pm your kitchen is packed and 6 phones are ringing. Every unanswered enquiry is a ₹5,000 catering lead lost.",
    proofPoint:
      "Restaurants using DeskBuddy convert 3× more enquiry calls into bookings — because they answer every one.",
    exampleCall: [
      { caller: "Weekend ke liye 15 log ki booking ho sakti hai?", agent: "Weekend 8 baje table for 15 available hai. Aapka naam aur contact?" },
      { caller: "Amit, 9876543210. Menu bhej sakte ho?", agent: "Bilkul Amit ji, menu aur booking confirmation abhi WhatsApp par bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Restaurants & Catering in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian restaurants, tent houses & catering. Takes reservations 24/7, quotes menus, sends bookings on WhatsApp — in Hindi & English.",
  },
  {
    slug: "real-estate",
    name: "Real Estate",
    h1: "AI Receptionist for Real Estate Agents in India",
    subhead:
      "DeskBuddy qualifies every property enquiry 24/7 — even at 2am. Captures budget, location, timeline, and pushes qualified leads to you and your CRM instantly.",
    painPoint:
      "Real estate buyers call the first 3 numbers they see. If yours rings out, you never hear from them again.",
    proofPoint:
      "Property brokers using DeskBuddy see 5× more qualified enquiries reach their team — every after-hours call gets answered.",
    exampleCall: [
      { caller: "Andheri West mein 2BHK available hai?", agent: "Ji Andheri West mein 3 options hai ₹95L-1.4Cr range mein. Aapka budget kya hai?" },
      { caller: "1.2 Cr tak. Ready-to-move chahiye.", agent: "Perfect — 2 ready-to-move properties match hoti hai. Details aur photos WhatsApp par bhej rahi hoon, agent kal 11 baje aapko call karega." },
    ],
    metaTitle: "AI Receptionist for Real Estate in India — Qualify Leads 24/7 | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian real estate agents. Qualifies property enquiries 24/7 in Hindi & English, captures budget, syncs leads to CRM.",
  },
  {
    slug: "coaching",
    name: "Coaching & Tuition",
    h1: "AI Receptionist for Coaching Centres & Tuition in India",
    subhead:
      "DeskBuddy answers every parent enquiry 24/7 — during exam season, after hours, on Sundays. Books demo classes, shares fee structure, and follows up on WhatsApp.",
    painPoint:
      "Parents call 5 coaching centres. They enrol at the first one that picks up. Missed calls = missed admissions.",
    proofPoint:
      "Coaching centres using DeskBuddy see 2× more demo class enrolments — because every parent gets an immediate response.",
    exampleCall: [
      { caller: "JEE coaching ke liye batch details chahiye class 11 ke liye.", agent: "Ji Class 11 JEE batch Monday shaam 4 baje start hoti hai. Aapke bachche ka naam?" },
      { caller: "Aarav. Fees kitni hai?", agent: "Aarav ji ke liye — ₹85,000 per year, EMI option available. Demo class free hai iss Saturday 3 baje — WhatsApp par slot confirm bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Coaching Centres in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian coaching & tuition centres. Answers parent enquiries 24/7, books demo classes, shares fees — in Hindi & English.",
  },
  {
    slug: "gym",
    name: "Gym & Fitness Studio",
    h1: "AI Receptionist for Gyms & Fitness Studios in India",
    subhead:
      "DeskBuddy answers every membership enquiry 24/7 — early morning, late evening, when your trainers are on the floor. Books trial sessions, shares plans, and follows up on WhatsApp.",
    painPoint:
      "Prospects call between workouts. If nobody picks up, they walk into the next gym they see.",
    proofPoint:
      "Fitness studios using DeskBuddy convert 45% more trial bookings — every enquiry gets an instant response.",
    exampleCall: [
      { caller: "Monthly membership kitne ki hai gym ki?", agent: "Ji monthly ₹1,899, quarterly ₹4,999, aur annual ₹14,999. Free trial available hai — kya main slot book kar doon?" },
      { caller: "Haan, kal subah 7 baje.", agent: "Kal subah 7 baje trial confirm. Aapka naam? Details WhatsApp par bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Gyms & Fitness Studios in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian gyms & fitness studios. Answers membership calls 24/7, books trials, quotes plans — in Hindi & English.",
  },
  {
    slug: "automobile",
    name: "Auto Service Centre",
    h1: "AI Receptionist for Automobile Service Centres in India",
    subhead:
      "DeskBuddy answers every service enquiry 24/7 — books slots, quotes service packages, handles insurance queries, and confirms pickup on WhatsApp.",
    painPoint:
      "Weekend mornings your workshop is chaotic. Missed calls are missed service bookings — and each one is worth ₹3,000+.",
    proofPoint:
      "Auto service centres using DeskBuddy fill 30% more service slots weekly — even the after-hours calls now convert.",
    exampleCall: [
      { caller: "Swift ki general service karani hai, kab slot milega?", agent: "Ji Swift ki general service ₹3,500 mein — kal ya parso subah 10 baje slot available hai. Aapka contact aur car number?" },
      { caller: "9876543210, MH01AB1234.", agent: "Perfect — kal 10 baje slot confirm. Pickup arrange chahiye? WhatsApp par details bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Auto Service Centres in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian auto service centres. Books service slots 24/7, quotes packages, arranges pickup — in Hindi & English.",
  },
  {
    slug: "laundry",
    name: "Laundry & Dry Cleaning",
    h1: "AI Receptionist for Laundry & Dry Cleaning in India",
    subhead:
      "DeskBuddy answers every pickup call 24/7 — quotes prices per item, schedules pickup and delivery, and confirms on WhatsApp.",
    painPoint:
      "Customers call between meetings for laundry pickup. Miss the call, lose the customer to the next dry cleaner in Google Maps.",
    proofPoint:
      "Laundry services using DeskBuddy see 60% more pickup bookings — because they can now answer every enquiry instantly.",
    exampleCall: [
      { caller: "Suit dry clean kitne ka hai aur kab pickup ho sakti hai?", agent: "Ji suit dry clean ₹250. Kal subah 10-12 ke beech pickup available. Aapka address aur number?" },
      { caller: "9876543210, Sector 22, Gurgaon.", agent: "Confirm — kal 10 baje pickup, delivery 48 ghante mein. Payment options aur receipt WhatsApp par bhej rahi hoon." },
    ],
    metaTitle: "AI Receptionist for Laundry & Dry Cleaning in India | DeskBuddy",
    metaDescription: "AI phone receptionist for Indian laundries & dry cleaners. Books pickups 24/7, quotes prices, confirms on WhatsApp — in Hindi & English.",
  },
];

export function getVerticalBySlug(slug: string): Vertical | undefined {
  return VERTICALS.find((v) => v.slug === slug);
}
