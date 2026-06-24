import React, { useState, useMemo, useEffect } from "react";

// --- HELPERS ---
const formatSentenceCase = (str) => {
  if (!str) return "";
  const s = str.trim();
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
};

// --- DATA ---
const DAGEN = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag", "Zaterdag", "Zondag"];

// JS Date.getDay() geeft 0 voor zondag, terwijl DAGEN met maandag begint (index 0).
// Deze helper zet dat recht zodat de juiste dag-kaart als "vandaag" gemarkeerd wordt.
const getTodayIndex = () => {
  const jsDay = new Date().getDay(); // 0 = zondag, 1 = maandag, ... 6 = zaterdag
  return jsDay === 0 ? 6 : jsDay - 1;
};

const INIT = [
  { id: 1, naam: "Spaghetti bolognese", time: "30 min", ings: ["500g rundergehakt", "400g gepelde tomaten", "2 uien", "knoflook", "400g spaghetti", "olijfolie"] },
  { id: 2, naam: "Kip-curry met rijst", time: "25 min", ings: ["600g kip", "400ml kokosmelk", "currypasta", "300g rijst", "1 ui", "koriander"] },
  { id: 3, naam: "Steak met frietjes", time: "40 min", ings: ["2 entrecôtes", "1kg aardappelen", "boter", "rozemarijn", "peper en zout"] },
  { id: 4, naam: "Zalm met groenten", time: "20 min", ings: ["2 zalmfilets", "1 broccoli", "400g wortelen", "olijfolie", "1 citroen", "knoflook"] },
  { id: 5, naam: "Risotto met paddenstoelen", time: "45 min", ings: ["300g risottorijst", "250g paddenstoelen", "1 ui", "1l bouillon", "100g parmezaan", "100ml witte wijn", "boter"] },
  { id: 6, naam: "Gegratineerd witloof", time: "50 min", ings: ["8 stronkjes witloof", "8 plakken hesp", "béchamelsaus", "200g geraspte kaas", "nootmuskaat"] },
  { id: 7, naam: "Lasagne", time: "60 min", ings: ["lasagnebladen", "500g rundergehakt", "800g gepelde tomaten", "béchamelsaus", "100g parmezaan", "mozzarella"] },
  { id: 8, naam: "Wraps met kip", time: "15 min", ings: ["400g kipfilet", "4 wraps", "1 krop sla", "2 tomaten", "1 avocado", "zure room"] },
];

// Modulaire bouwblokken (worden getoond in Sentence Case via formatSentenceCase)
const MODULAIR_DATA = {
  basis: ["patatjes", "puree", "frietjes", "kroketten", "rijst", "pasta", "gebakken aardappelen", "quinoa", "couscous", "zoete aardappel", "wraps", "naanbrood"],
  eiwit: ["kipfilet", "gehakt", "steak", "zalmfilet", "witte pens", "braadworst", "kabeljauw", "falafel", "scampi's", "tofu", "spekblokjes", "varkenshaasje", "gehaktballetjes", "kipstuckjes", "halloumi"],
  groente: ["boontjes", "erwtjes & wortels", "broccoli", "bloemkool", "spinazie", "witloof", "appelmoes", "courgette", "paprika", "champignons", "tomaat", "wortelen", "prei", "asperges"],
  saus: ["bolognesesaus", "currysaus", "béchamelsaus", "champignonroomsaus", "pepersaus", "tomatensaus", "kruidenboter", "pesto", "pindasaus"]
};

// Slimme vertaler voor modulaire selecties naar échte boodschappen
const MIX_INGREDIENTEN_MAP = {
  "puree": ["aardappelen", "melk", "boter"],
  "patatjes": ["aardappelen"],
  "frietjes": ["diepvriesfrietjes (of aardappelen)"],
  "kroketten": ["diepvrieskroketten"],
  "gebakken aardappelen": ["krieltjes", "boter"],
  "bolognesesaus": ["pastasaus", "italiaanse kruiden"],
  "béchamelsaus": ["boter", "bloem", "melk", "geraspte kaas"],
  "champignonroomsaus": ["champignons", "room", "bouillonblokje"],
  "pepersaus": ["room", "peperbolletjes", "vleesbouillon"],
  "kruidenboter": ["boter", "knoflook", "verse kruiden"],
  "pesto": ["potje groene pesto"],
  "pindasaus": ["pindakaas", "kokosmelk", "sambal"]
};

// Standaard "voorraadkast" items: dingen die de meeste mensen altijd in huis
// hebben. De gebruiker kan deze lijst zelf aanpassen via de instellingen.
const DEFAULT_PANTRY_STAPLES = [
  "olijfolie", "zout", "peper", "peper en zout", "bloem", "suiker",
  "boter", "knoflook", "azijn", "mosterd", "bouillonblokje"
];

// Check of een ingrediënt-naam overeenkomt met een voorraadkast-item.
// Houdt rekening met deelmatches (bv. "knoflook" matcht ook "2 tenen knoflook").
const isPantryStaple = (ingName, staples) => {
  const clean = ingName.toLowerCase().trim();
  return staples.some(s => {
    const staple = s.toLowerCase().trim();
    return clean === staple || clean.includes(staple);
  });
};

// Eenheid-normalisatie: alle gewichten -> gram, alle volumes -> ml.
// "unit" blijft de oorspronkelijke eenheid voor weergave; "baseUnit"/"baseVal"
// zijn de genormaliseerde waarden die gebruikt worden om op te tellen.
const UNIT_NORMALIZATION = {
  g: { base: 'g', factor: 1 },
  gram: { base: 'g', factor: 1 },
  kg: { base: 'g', factor: 1000 },
  kilo: { base: 'g', factor: 1000 },
  ml: { base: 'ml', factor: 1 },
  l: { base: 'ml', factor: 1000 },
  liter: { base: 'ml', factor: 1000 },
};

// Eenheden die NIET genormaliseerd/optelbaar zijn op waarde (te contextafhankelijk
// om zomaar te combineren), maar wel herkend worden zodat de naam goed wordt gesplitst.
const NON_CONVERTIBLE_UNITS = ['el', 'tl', 'stuks', 'blik', 'pot', 'teentjes', 'tenen'];

// Simpele NL enkelvoud-normalisatie, uitsluitend gebruikt om te GROEPEREN
// (bv. "2 uien" + "1 ui" -> dezelfde groep). Voor de weergave wordt de
// meervoudsvorm gebruikt zodra de opgetelde hoeveelheid >1 is.
// Dit is een heuristiek voor de meest voorkomende onregelmatige NL-ingrediënten,
// geen volledige grammaticale ontleding.
const IRREGULAR_PLURALS = {
  'uien': 'ui', 'tomaten': 'tomaat', 'aardappelen': 'aardappel', 'wortelen': 'wortel',
  'citroenen': 'citroen', 'limoenen': 'limoen', 'eieren': 'ei', 'champignons': 'champignon',
  'paprika\'s': 'paprika', 'avocado\'s': 'avocado', 'uitjes': 'uitje',
};
const PLURAL_OF = Object.fromEntries(Object.entries(IRREGULAR_PLURALS).map(([plural, singular]) => [singular, plural]));

const singularizeForGrouping = (name) => IRREGULAR_PLURALS[name] || name;

const parseIngrediënt = (str) => {
  const allUnits = [...Object.keys(UNIT_NORMALIZATION), ...NON_CONVERTIBLE_UNITS];
  const unitPattern = allUnits.join('|');
  const match = str.trim().match(new RegExp(`^([\\d.,]+)\\s*(${unitPattern})?\\s+(.+)$`, 'i'));
  if (match) {
    const rawUnit = match[2] ? match[2].toLowerCase() : '';
    const val = parseFloat(match[1].replace(',', '.'));
    const norm = UNIT_NORMALIZATION[rawUnit];
    return {
      val,
      unit: rawUnit,
      name: match[3].toLowerCase().trim(),
      // Genormaliseerde basiseenheid + waarde, gebruikt om gelijksoortige
      // eenheden (g/kg, ml/l) correct bij elkaar op te tellen.
      baseUnit: norm ? norm.base : rawUnit,
      baseVal: norm ? val * norm.factor : val,
    };
  }
  return { val: null, unit: '', name: str.toLowerCase().trim(), baseUnit: '', baseVal: null };
};

// Maakt van een genormaliseerde basiswaarde weer een leesbare, "mooie" eenheid
// (bijv. 1500g -> 1.5kg) voor weergave op de boodschappenlijst.
const formatQuantity = (baseVal, baseUnit) => {
  if (baseVal === null) return '';
  if (baseUnit === 'g') {
    if (baseVal >= 1000) {
      const kg = baseVal / 1000;
      return `${kg % 1 === 0 ? kg : kg.toFixed(1)}kg `;
    }
    return `${baseVal % 1 === 0 ? baseVal : baseVal.toFixed(0)}g `;
  }
  if (baseUnit === 'ml') {
    if (baseVal >= 1000) {
      const l = baseVal / 1000;
      return `${l % 1 === 0 ? l : l.toFixed(1)}l `;
    }
    return `${baseVal % 1 === 0 ? baseVal : baseVal.toFixed(0)}ml `;
  }
  // Niet-converteerbare eenheden (el, tl, stuks, ...): toon waarde + eenheid zoals opgegeven
  return `${baseVal % 1 === 0 ? baseVal : baseVal} ${baseUnit ? baseUnit + ' ' : ''}`.trim() + ' ';
};

// --- ICONS ---
const Icons = {
  Plus: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  Search: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>,
  Shuffle: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.7-1.1 2-1.7 3.3-1.7H22M2 6h1.4c1.3 0 2.5.6 3.3 1.7l6.1 8.6c.7 1.1 2 1.7 3.3 1.7H22"/><path d="m18 2 4 4-4 4M18 14l4 4-4 4"/></svg>,
  Leaf: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>,
  Pen: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  Calendar: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>,
  Bag: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>,
  Book: () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>,
  ChevronRight: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  Check: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>,
  Clock: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Grid: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/></svg>,
  Settings: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>,
  X: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  Box: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73Z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>,
};

// --- STYLES ---
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --bg: #F9FAFB;
    --surface: #FFFFFF;
    --primary: #111827;
    --primary-hover: #1F2937;
    --text-main: #111827;
    --text-muted: #6B7280;
    --text-light: #9CA3AF;
    --border: #F3F4F6;
    --border-dark: #E5E7EB;
    --accent: #0F766E;
    --accent-light: #F0FDFA;
    --danger: #EF4444;
    --danger-light: #FEF2F2;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
  body { background: var(--bg); font-family: 'Inter', sans-serif; color: var(--text-main); }
  
  .app-container {
    max-width: 480px;
    margin: 0 auto;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
    position: relative;
    box-shadow: 0 0 40px rgba(0,0,0,0.03);
  }

  .header {
    padding: 24px 24px 16px;
    background: rgba(249, 250, 251, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(243, 244, 246, 0.8);
    position: sticky;
    top: 0;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .header-left h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.04em; color: var(--primary); }
  .header-left p { font-size: 14px; color: var(--text-muted); margin-top: 4px; }
  
  .btn-reset {
    background: var(--surface);
    border: 1px solid var(--border-dark);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-main);
    cursor: pointer;
    padding: 8px 14px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s;
  }
  .btn-reset:hover { color: var(--danger); border-color: var(--danger); background: var(--danger-light); }
  .btn-reset.btn-reset-positive:hover { color: var(--accent); border-color: var(--accent); background: var(--accent-light); }

  .content { flex: 1; padding: 20px 24px 100px; overflow-y: auto; }
  .day-list { display: flex; flex-direction: column; gap: 16px; }
  .day-section { display: flex; flex-direction: column; gap: 8px; }
  .day-label { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-light); margin-left: 4px; display: flex; align-items: center; gap: 8px; }
  .today-tag { font-size: 11px; font-weight: 600; color: var(--accent); background: var(--accent-light); padding: 2px 7px; border-radius: 8px; margin-left: 0; flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px; text-transform: none; letter-spacing: normal; }
  .today-tag svg { width: 12px; height: 12px; }

  .card { background: var(--surface); border-radius: 16px; padding: 20px; border: 1px solid var(--border); transition: all 0.2s ease; }
  .card.today { border: 1px solid var(--accent); }
  .card.empty {
    border: 1px dashed var(--border-dark);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-muted);
    font-weight: 500;
    font-size: 15px;
    padding: 16px;
  }
  .card.empty:hover { background: var(--surface); border-style: solid; color: var(--primary); }
  .card.empty.today { border-style: dashed; border-color: var(--accent); }
  .card.filled { display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; }
  .card.filled:active { opacity: 0.7; }
  .card-top { display: flex; flex-direction: column; gap: 4px; }
  .meal-title { font-size: 17px; font-weight: 600; color: var(--primary); line-height: 1.3; }
  .meal-meta { font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

  .bottom-nav {
    position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: 480px;
    background: rgba(255, 255, 255, 0.9); backdrop-filter: blur(10px); border-top: 1px solid var(--border);
    display: flex; padding: 12px 16px 24px; gap: 8px; z-index: 20;
  }
  .nav-item { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; background: none; border: none; color: var(--text-light); font-size: 11px; font-weight: 600; cursor: pointer; transition: color 0.2s; }
  .nav-item.active { color: var(--primary); }

  .sheet-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); z-index: 100; display: flex; flex-direction: column; justify-content: flex-end; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
  .sheet-overlay.open { opacity: 1; pointer-events: auto; }
  .sheet { background: var(--surface); border-radius: 24px 24px 0 0; height: 85vh; display: flex; flex-direction: column; transform: translateY(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; }
  .sheet-overlay.open .sheet { transform: translateY(0); }
  .sheet-close { position: absolute; top: 16px; right: 16px; width: 32px; height: 32px; border-radius: 50%; border: none; background: var(--bg); color: var(--text-muted); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; z-index: 1; }
  .sheet-close:hover { background: var(--border); color: var(--primary); }
  .sheet-header { padding: 24px 56px 16px 24px; }
  .sheet-title { font-size: 20px; font-weight: 700; color: var(--primary); }
  
  .sheet-tabs { display: flex; padding: 0 24px; gap: 16px; border-bottom: 1px solid var(--border); margin-bottom: 16px; overflow-x: auto; scrollbar-width: none; }
  .sheet-tabs::-webkit-scrollbar { display: none; }
  .sheet-tab { padding: 12px 0; font-size: 14px; font-weight: 500; color: var(--text-muted); background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer; display: flex; align-items: center; gap: 6px; white-space: nowrap; flex-shrink: 0; }
  .sheet-tab.active { color: var(--primary); border-bottom-color: var(--primary); }
  .sheet-content { flex: 1; overflow-y: auto; padding: 0 24px 24px; }
  
  .input-wrap { position: relative; margin-bottom: 16px; }
  .input-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--text-light); }
  .input { width: 100%; padding: 14px 14px 14px 44px; background: var(--bg); border: 1px solid transparent; border-radius: 12px; font-size: 15px; font-family: inherit; color: var(--text-main); outline: none; transition: all 0.2s; }
  .input:focus { background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
  .input.has-sort { padding-right: 44px; }
  .input-sort-btn { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); width: 32px; height: 32px; border-radius: 8px; border: none; background: transparent; color: var(--text-light); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; }
  .input-sort-btn:hover { background: var(--border); color: var(--text-muted); }
  .input-sort-btn.active { background: var(--accent-light); color: var(--accent); }
  .input-sort-btn svg { width: 16px; height: 16px; }

  .time-input-wrap { position: relative; margin-bottom: 20px; }
  .time-input { width: 100%; padding: 14px 52px 14px 14px; background: var(--bg); border: 1px solid transparent; border-radius: 12px; font-size: 15px; font-family: inherit; color: var(--text-main); outline: none; transition: all 0.2s; }
  .time-input:focus { background: var(--surface); border-color: var(--accent); box-shadow: 0 0 0 3px var(--accent-light); }
  .time-unit { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); color: var(--text-muted); font-size: 14px; font-weight: 500; pointer-events: none; }

  .list-item { display: flex; align-items: center; justify-content: space-between; padding: 16px 0; border-bottom: 1px solid var(--border); cursor: pointer; }
  .list-item-title { font-size: 15px; font-weight: 500; color: var(--primary); }
  .list-item-sub { font-size: 13px; color: var(--text-muted); margin-top: 4px; display: flex; align-items: center; gap: 6px; }
  
  .form-group { margin-bottom: 20px; }
  .label { display: block; font-size: 13px; font-weight: 600; color: var(--text-muted); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.03em; }
  .btn-primary { width: 100%; padding: 16px; background: var(--primary); color: white; border: none; border-radius: 12px; font-size: 15px; font-weight: 600; cursor: pointer; display: flex; justify-content: center; align-items: center; gap: 8px; transition: background 0.2s; }
  .btn-primary:disabled { opacity: 0.4; cursor: not-allowed; }

  /* MODULAR MATRIX DESIGN */
  .modular-grid { display: flex; flex-direction: column; gap: 16px; margin-bottom: 24px; }
  .modular-row { display: flex; flex-direction: column; gap: 8px; }
  .chip-container { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip { padding: 10px 14px; background: var(--bg); border: 1px solid var(--border-dark); border-radius: 20px; font-size: 14px; color: var(--text-main); cursor: pointer; transition: all 0.2s; }
  .chip.selected { background: var(--accent-light); border-color: var(--accent); color: var(--accent); font-weight: 500; }

  /* TOGGLE GROCERY LIST VIEW - Premium iOS Style */
  .toggle-wrap { display: flex; background: #E5E7EB; padding: 4px; border-radius: 12px; margin-bottom: 20px; }
  .toggle-btn { flex: 1; padding: 10px; text-align: center; font-size: 14px; font-weight: 600; color: #6B7280; border-radius: 10px; cursor: pointer; border: none; background: transparent; transition: all 0.2s; box-shadow: none; }
  .toggle-btn.active { background: #FFFFFF; color: #111827; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }

  .grocery-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
  .btn-copy { background: var(--surface); border: 1px solid var(--border-dark); font-size: 13px; font-weight: 500; color: var(--text-main); cursor: pointer; padding: 8px 14px; border-radius: 20px; display: flex; align-items: center; gap: 6px; }
  .grocery-section { margin-bottom: 24px; }
  .grocery-day { font-size: 14px; font-weight: 600; color: var(--primary); margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
  .grocery-day::after { content: ''; flex: 1; height: 1px; background: var(--border); }
  .grocery-item { display: flex; align-items: center; gap: 12px; padding: 12px 0; cursor: pointer; }
  .checkbox { width: 22px; height: 22px; border-radius: 6px; border: 2px solid var(--border-dark); display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; transition: background 0.15s; }
  .grocery-item.checked .checkbox { background: var(--accent); border-color: var(--accent); }
  .grocery-item.checked .grocery-item-name { color: var(--text-light); text-decoration: line-through; }
  .grocery-item-name { font-size: 15px; color: var(--text-main); transition: all 0.2s; text-transform: lowercase; }

  /* Voorraadkast (pantry staples) styling */
  .grocery-item.pantry { opacity: 0.55; }
  .grocery-item.pantry .grocery-item-name { color: var(--text-muted); }
  .pantry-tag { font-size: 11px; font-weight: 600; color: var(--accent); background: var(--accent-light); padding: 2px 7px; border-radius: 8px; margin-left: 6px; flex-shrink: 0; display: inline-flex; align-items: center; gap: 3px; text-transform: none; }
  .btn-icon-ghost { background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 8px; display: flex; align-items: center; border-radius: 10px; transition: all 0.2s; }
  .btn-icon-ghost:hover { color: var(--primary); background: var(--bg); }

  .pantry-list { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
  .pantry-row { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; background: var(--bg); border-radius: 12px; }
  .pantry-row span { font-size: 14px; color: var(--text-main); text-transform: lowercase; }
  
  .badge { position: absolute; top: -2px; right: -4px; width: 10px; height: 10px; background-color: var(--accent); border: 2px solid var(--surface); border-radius: 50%; }

  .modal-overlay { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px); z-index: 110; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: var(--surface); border-radius: 20px; padding: 24px; max-width: 340px; width: 100%; text-align: center; }
  .modal-buttons { display: flex; gap: 12px; }
  .btn-modal-secondary { flex: 1; padding: 12px; background: var(--bg); border: 1px solid var(--border-dark); font-weight: 600; border-radius: 12px; cursor: pointer; color: var(--text-main); }
  .btn-modal-danger { flex: 1; padding: 12px; background: var(--danger); color: white; border: none; font-weight: 600; border-radius: 12px; cursor: pointer; }
  
  /* RECIPE TAB */
  .ing-list { margin-top: 12px; display: flex; flex-direction: column; gap: 8px; }
  .ing-chip { display: flex; align-items: center; justify-content: space-between; padding: 6px 14px; background: var(--bg); border-radius: 10px; font-size: 14px; color: var(--text-main); }
  .ing-chip-del { background: none; border: none; color: var(--text-light); cursor: pointer; display: flex; align-items: center; }
  .ing-chip-del:hover { color: var(--danger); }
  .add-row { display: flex; gap: 8px; }
  .add-row .input { flex: 1; padding-left: 14px; }
  .btn-add { background: var(--accent); border: none; border-radius: 12px; width: 50px; height: 50px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; cursor: pointer; color: white; transition: opacity 0.2s ease; }
  .btn-add:hover { opacity: 0.85; }
  .btn-add svg { width: 26px; height: 26px; stroke-width: 2; }
  .btn-text { background: none; border: none; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; gap: 4px; transition: color 0.2s; }
  .btn-text:hover { color: var(--primary); }
  .btn-text.danger:hover { color: var(--danger); }
`;

export default function App() {
  const [activeTab, setActiveTab] = useState("week"); // week | recipes | list
  const [plan, setPlan] = useState({});
  const [maaltijden, setMaaltijden] = useState(INIT);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState(null);
  const [detailDay, setDetailDay] = useState(null);
  const [newIngInput, setNewIngInput] = useState("");
  
  // Sheet State
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState("search"); // search | modular | ingredients | surprise
  const [activeDay, setActiveDay] = useState(null);

  // Forms State
  const [searchQ, setSearchQ] = useState("");
  const [sortByTime, setSortByTime] = useState(false);
  const [ingQ, setIngQ] = useState("");
  
  // Recipes Tab Search
  const [recipeSearchQ, setRecipeSearchQ] = useState("");

  // Recipes Tab State
  const [editingRecipe, setEditingRecipe] = useState(null); // 'new' or recipe ID
  const [customName, setCustomName] = useState("");
  const [customTime, setCustomTime] = useState(""); 
  const [customIngs, setCustomIngs] = useState([]);
  const [customIngInput, setCustomIngInput] = useState("");

  // Modulaire Selectie State
  const [modBasis, setModBasis] = useState("");
  const [modEiwit, setModEiwit] = useState("");
  const [modGroente, setModGroente] = useState("");
  const [modSaus, setModSaus] = useState("");

  // Surprise State
  const [surpriseLoading, setSurpriseLoading] = useState(false);
  const [surpriseRes, setSurpriseRes] = useState(null);

  // Grocery State
  const [listView, setListView] = useState("dag"); // 'dag' | 'totaal'
  const [checkedItems, setCheckedItems] = useState({});
  const [copied, setCopied] = useState(false);

  // Voorraadkast (pantry staples) State
  const [pantryStaples, setPantryStaples] = useState(DEFAULT_PANTRY_STAPLES);
  const [showPantrySettings, setShowPantrySettings] = useState(false);
  const [pantryInput, setPantryInput] = useState("");
  const [hidePantryItems, setHidePantryItems] = useState(false);

  // "Kopieer vorige week" State
  const [previousPlan, setPreviousPlan] = useState(null);

  // Voorkom dat het scherm "erachter" kan scrollen zodra een sheet of
  // bevestigingsmodal open is — anders kun je per ongeluk de achtergrond
  // verschuiven terwijl een overlay in beeld staat.
  useEffect(() => {
    const isAnyOverlayOpen = sheetOpen || detailDay !== null || showPantrySettings || showResetConfirm || recipeToDelete !== null || editingRecipe !== null;
    document.body.style.overflow = isAnyOverlayOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sheetOpen, detailDay, showPantrySettings, showResetConfirm, recipeToDelete, editingRecipe]);

  const plannedCount = Object.keys(plan).length;
  const todayIndex = useMemo(() => getTodayIndex(), []);

  const openSheet = (dayIndex) => {
    setActiveDay(dayIndex);
    // Als de dag al een Mix & Match-maaltijd heeft, herstel de losse keuzes en
    // open meteen het juiste tabblad — anders moet je alles opnieuw samenstellen
    // om alleen bv. de saus aan te passen.
    const existingMeal = plan[dayIndex];
    if (existingMeal && existingMeal.modular && existingMeal.modSelection) {
      setModBasis(existingMeal.modSelection.basis || "");
      setModEiwit(existingMeal.modSelection.eiwit || "");
      setModGroente(existingMeal.modSelection.groente || "");
      setModSaus(existingMeal.modSelection.saus || "");
      setSheetMode("modular");
    } else {
      setSheetMode("search");
    }
    setSheetOpen(true);
  };
  
  const closeSheet = () => {
    setSheetOpen(false);
    setTimeout(() => {
      setSearchQ("");
      setIngQ("");
      setSurpriseRes(null);
      setModBasis(""); setModEiwit(""); setModGroente(""); setModSaus("");
    }, 300);
  };

  const selectMeal = (meal) => {
    setPlan(prev => ({ ...prev, [activeDay]: meal }));
    // Verwijder specifieke checked state voor de dag die zojuist is overschreven/gepland
    setCheckedItems(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        if (k.startsWith(`${activeDay}-`)) {
          delete next[k];
        }
      });
      return next;
    });
    closeSheet();
  };

  const saveModularMeal = () => {
    if (!modBasis && !modEiwit && !modGroente && !modSaus) return;
    
    // Bouw de naam op een dynamische manier op
    let naam = "";
    const selectedComponentNames = [modEiwit, modBasis, modGroente, modSaus].filter(Boolean);
    const selectedIngredients = [];

    // Map modulaire stukken naar échte ingrediënten
    selectedComponentNames.forEach(comp => {
      if (MIX_INGREDIENTEN_MAP[comp]) {
        selectedIngredients.push(...MIX_INGREDIENTEN_MAP[comp]);
      } else {
        selectedIngredients.push(comp);
      }
    });

    if (modEiwit) {
      naam = modEiwit;
      const metParts = [];
      if (modBasis) metParts.push(modBasis);
      if (modGroente) metParts.push(modGroente);
      if (modSaus) metParts.push(modSaus);
      
      if (metParts.length === 1) naam += ` met ${metParts[0]}`;
      else if (metParts.length === 2) naam += ` met ${metParts[0]} en ${metParts[1]}`;
      else if (metParts.length === 3) naam += ` met ${metParts[0]}, ${metParts[1]} en ${metParts[2]}`;
    } else {
      if (modBasis) {
        naam = modBasis;
        const metParts = [];
        if (modGroente) metParts.push(modGroente);
        if (modSaus) metParts.push(modSaus);
        
        if (metParts.length === 1) naam += ` met ${metParts[0]}`;
        else if (metParts.length === 2) naam += ` met ${metParts[0]} en ${metParts[1]}`;
      } else if (modGroente) {
        naam = modGroente;
        if (modSaus) naam += ` met ${modSaus}`;
      } else if (modSaus) {
        naam = modSaus;
      }
    }

    const newMeal = {
      id: Date.now(),
      naam: formatSentenceCase(naam),
      time: "", 
      ings: selectedIngredients,
      modular: true,
      // Bewaar de losse keuzes zelf (niet enkel de samengestelde naam/ingrediënten),
      // zodat "Verander maaltijd" de Mix & Match-tegels weer kan voor-selecteren.
      modSelection: { basis: modBasis, eiwit: modEiwit, groente: modGroente, saus: modSaus }
    };

    // Alleen selecteren, niet toevoegen aan globale 'maaltijden' Kookboek
    selectMeal(newMeal);
  };

  const removeMeal = (dayIndex) => {
    setPlan(prev => { const newPlan = { ...prev }; delete newPlan[dayIndex]; return newPlan; });
    setDetailDay(null);
  };

  // Ingrediënten van een al-geplande dag direct aanpassen (bv. hoeveelheid wijzigen),
  // zonder de hele maaltijd opnieuw te moeten kiezen. Werkt voor elk type maaltijd,
  // inclusief Mix & Match-creaties die niet in het kookboek staan.
  const updatePlannedIng = (dayIndex, ingIndex, newValue) => {
    setPlan(prev => {
      const meal = prev[dayIndex];
      if (!meal) return prev;
      const newIngs = [...meal.ings];
      newIngs[ingIndex] = newValue;
      return { ...prev, [dayIndex]: { ...meal, ings: newIngs } };
    });
    // De regel is gewijzigd, dus een eventueel afgevinkt vakje op de
    // boodschappenlijst klopt niet meer met de nieuwe tekst — resetten.
    setCheckedItems(prev => {
      const key = `${dayIndex}-${ingIndex}`;
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const removePlannedIng = (dayIndex, ingIndex) => {
    setPlan(prev => {
      const meal = prev[dayIndex];
      if (!meal) return prev;
      const newIngs = meal.ings.filter((_, i) => i !== ingIndex);
      return { ...prev, [dayIndex]: { ...meal, ings: newIngs } };
    });
    // Na het verwijderen schuiven alle ingrediënten na deze index één plekje op.
    // Hun checked-status moet meeschuiven, anders hoort het afvinkbolletje
    // straks bij een ander ingrediënt dan waarvoor het bedoeld was.
    setCheckedItems(prev => {
      const next = {};
      Object.entries(prev).forEach(([key, value]) => {
        const [keyDay, keyIdx] = key.split('-').map(Number);
        if (keyDay !== dayIndex) { next[key] = value; return; }
        if (keyIdx === ingIndex) return; // verwijderde regel: status vervalt
        const newIdx = keyIdx > ingIndex ? keyIdx - 1 : keyIdx;
        next[`${keyDay}-${newIdx}`] = value;
      });
      return next;
    });
  };

  const addPlannedIng = (dayIndex, value) => {
    if (!value.trim()) return;
    setPlan(prev => {
      const meal = prev[dayIndex];
      if (!meal) return prev;
      return { ...prev, [dayIndex]: { ...meal, ings: [...meal.ings, value.trim().toLowerCase()] } };
    });
  };

  const executeResetWeek = () => {
    // Bewaar het huidige plan als "vorige week" zodat het later met één klik
    // teruggezet kan worden — alleen als er daadwerkelijk iets gepland was.
    if (Object.keys(plan).length > 0) {
      setPreviousPlan(plan);
    }
    setPlan({}); setCheckedItems({}); setShowResetConfirm(false);
  };

  const kopieerVorigeWeek = () => {
    if (!previousPlan) return;
    setPlan(previousPlan);
    setCheckedItems({});
  };

  // Nieuw Gerecht / Bewerk Gerecht Functies (Kookboek)
  const addCustomIng = () => {
    if (!customIngInput.trim()) return;
    setCustomIngs(prev => [...prev, customIngInput.trim().toLowerCase()]);
    setCustomIngInput("");
  };

  const openRecipeForm = (recipe = null) => {
    if (recipe) {
      setEditingRecipe(recipe.id);
      setCustomName(recipe.naam);
      setCustomTime(recipe.time ? recipe.time.replace(/\s*min$/, "") : "");
      setCustomIngs([...recipe.ings]);
    } else {
      setEditingRecipe('new');
      setCustomName("");
      setCustomTime("");
      setCustomIngs([]);
    }
    setCustomIngInput("");
  };

  const saveRecipe = () => {
    if (!customName.trim()) return;
    const formattedTime = customTime.trim() ? `${customTime.trim()} min` : "";
    const cleanedIngs = customIngs.filter(ing => ing.trim() !== "");

    if (editingRecipe === 'new') {
      const newMeal = { id: Date.now(), naam: formatSentenceCase(customName), time: formattedTime, ings: cleanedIngs, custom: true };
      setMaaltijden(prev => [newMeal, ...prev]);
    } else {
      setMaaltijden(prev => prev.map(m => m.id === editingRecipe ? { ...m, naam: formatSentenceCase(customName), time: formattedTime, ings: cleanedIngs } : m));
      setPlan(prev => {
        const newPlan = { ...prev };
        Object.keys(newPlan).forEach(day => {
          if (newPlan[day].id === editingRecipe) {
            newPlan[day] = { ...newPlan[day], naam: formatSentenceCase(customName), time: formattedTime, ings: cleanedIngs };
          }
        });
        return newPlan;
      });
    }
    setEditingRecipe(null);
  };

  const executeDeleteRecipe = () => {
    if (!recipeToDelete) return;
    setMaaltijden(prev => prev.filter(m => m.id !== recipeToDelete));
    setPlan(prev => {
      const newPlan = { ...prev };
      Object.keys(newPlan).forEach(day => {
        if (newPlan[day].id === recipeToDelete) delete newPlan[day];
      });
      return newPlan;
    });
    setRecipeToDelete(null);
  };

  const verrasMij = () => {
    setSurpriseLoading(true); setSurpriseRes(null);
    setTimeout(() => {
      const geplandeIdSet = new Set(Object.values(plan).map(m => m.id));
      const onbeschikbaar = maaltijden.filter(m => !geplandeIdSet.has(m.id));
      const selectiePool = onbeschikbaar.length > 0 ? onbeschikbaar : maaltijden;
      const willekeurigGerecht = selectiePool[Math.floor(Math.random() * selectiePool.length)];
      setSurpriseRes({ ...willekeurigGerecht, reden: "Perfect passend in je weekmenu!" });
      setSurpriseLoading(false);
    }, 600);
  };

  // Gegroepeerde boodschappen data-generatie
  const groupedGroceries = useMemo(() => {
    const groups = {};
    DAGEN.forEach((_, index) => {
      const meal = plan[index];
      if (meal && meal.ings) {
        meal.ings.forEach((ing, i) => {
          const parsed = parseIngrediënt(ing);
          // Groeperen op de genormaliseerde (enkelvoud) naam + basiseenheid, zodat
          // "2 uien" en "1 ui" samenkomen, en "500g" + "0.5kg" correct optellen.
          const groupName = singularizeForGrouping(parsed.name);
          const key = parsed.baseUnit ? `${parsed.baseUnit}-${groupName}` : groupName;

          if (!groups[key]) {
            groups[key] = {
              name: parsed.name,
              singularName: groupName,
              unit: parsed.unit,
              baseUnit: parsed.baseUnit,
              val: parsed.val,
              baseVal: parsed.baseVal,
              originalKeys: [`${index}-${i}`]
            };
          } else {
            if (parsed.baseVal !== null && groups[key].baseVal !== null) {
              groups[key].baseVal += parsed.baseVal;
              groups[key].val = groups[key].baseVal; // val volgt nu de samengetelde basiswaarde
            }
            groups[key].originalKeys.push(`${index}-${i}`);
          }
        });
      }
    });
    // Kies de juiste weergavenaam: meervoud zodra de samengetelde hoeveelheid >1 is
    // (zonder eenheid, dus voor telbare items als "ui"/"uien"); anders enkelvoud/origineel.
    return Object.values(groups).map(g => {
      if (!g.baseUnit && g.baseVal !== null && g.baseVal > 1 && PLURAL_OF[g.singularName]) {
        return { ...g, name: PLURAL_OF[g.singularName] };
      }
      if (!g.baseUnit && g.baseVal !== null && g.baseVal === 1 && PLURAL_OF[g.singularName]) {
        return { ...g, name: g.singularName };
      }
      return g;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [plan]);

  const toggleGroupChecked = (group) => {
    const allChecked = group.originalKeys.every(k => checkedItems[k]);
    setCheckedItems(prev => {
      const next = { ...prev };
      group.originalKeys.forEach(k => {
        if (allChecked) delete next[k]; // uncheck
        else next[k] = true; // check
      });
      return next;
    });
  };

  const kopieerLijst = () => {
    const lines = [];
    if (listView === "dag") {
      DAGEN.forEach((dayName, index) => {
        const meal = plan[index];
        if (meal && meal.ings && meal.ings.length > 0) {
          const ingsToShow = hidePantryItems
            ? meal.ings.filter(ing => !isPantryStaple(parseIngrediënt(ing).name, pantryStaples))
            : meal.ings;
          if (ingsToShow.length === 0) return;
          lines.push(`--- ${dayName} (${formatSentenceCase(meal.naam)}) ---`);
          ingsToShow.forEach(ing => lines.push(`[ ] ${ing.toLowerCase()}`));
          lines.push("");
        }
      });
    } else {
      lines.push(`--- Boodschappen (Totaallijst) ---`);
      groupedGroceries.forEach(g => {
        if (hidePantryItems && isPantryStaple(g.name, pantryStaples)) return;
        const name = g.baseVal !== null ? `${formatQuantity(g.baseVal, g.baseUnit)}${g.name}` : g.name;
        lines.push(`[ ] ${name}`);
      });
    }

    const tekst = lines.join("\n");
    try {
      const tempTextArea = document.createElement("textarea");
      tempTextArea.value = tekst; tempTextArea.style.position = "fixed"; tempTextArea.style.opacity = "0";
      document.body.appendChild(tempTextArea); tempTextArea.focus(); tempTextArea.select();
      if (document.execCommand('copy')) { setCopied(true); setTimeout(() => setCopied(false), 2000); }
      document.body.removeChild(tempTextArea);
    } catch (err) { console.error(err); }
  };

  // Voorraadkast (pantry staples) beheer
  const addPantryStaple = () => {
    const val = pantryInput.trim().toLowerCase();
    if (!val || pantryStaples.includes(val)) { setPantryInput(""); return; }
    setPantryStaples(prev => [...prev, val]);
    setPantryInput("");
  };

  const removePantryStaple = (item) => {
    setPantryStaples(prev => prev.filter(s => s !== item));
  };

  const filteredRecipes = recipeSearchQ.trim() === ""
    ? maaltijden
    : maaltijden.filter(m => m.naam.toLowerCase().includes(recipeSearchQ.toLowerCase()) || m.ings.some(i => i.toLowerCase().includes(recipeSearchQ.toLowerCase())));

  const parseTimeMinutes = (timeStr) => {
    if (!timeStr) return Infinity; // geen tijd opgegeven -> onderaan bij sorteren
    const match = timeStr.match(/\d+/);
    return match ? parseInt(match[0], 10) : Infinity;
  };

  const searchResults = useMemo(() => {
    const base = searchQ.trim() === "" ? maaltijden : maaltijden.filter(m => m.naam.toLowerCase().includes(searchQ.toLowerCase()) || m.ings.some(i => i.toLowerCase().includes(searchQ.toLowerCase())));
    if (!sortByTime) return base;
    return [...base].sort((a, b) => parseTimeMinutes(a.time) - parseTimeMinutes(b.time));
  }, [searchQ, maaltijden, sortByTime]);
  const ingResults = ingQ.trim() === "" ? [] : maaltijden.filter(m => m.ings.some(i => i.toLowerCase().includes(ingQ.toLowerCase())));
  const hasGroceries = Object.values(plan).some(m => m.ings && m.ings.length > 0);

  return (
    <>
      <style>{css}</style>
      <div className="app-container">
        
        {/* HEADER */}
        <header className="header">
          <div className="header-left">
            <h1>
              {activeTab === "week" && "Weekmenu"}
              {activeTab === "recipes" && "Gerechten"}
              {activeTab === "list" && "Boodschappen"}
            </h1>
            <p>
              {activeTab === "week" && (plannedCount === 0 ? "Nog geen dagen gepland" : `${plannedCount} ${plannedCount === 1 ? 'dag' : 'dagen'} gepland`)}
              {activeTab === "recipes" && "Je persoonlijke kookboek"}
              {activeTab === "list" && (
                plannedCount === 0
                  ? "Plan eerst je week"
                  : (hasGroceries ? "Je benodigdheden voor deze week" : "Geen boodschappen nodig")
              )}
            </p>
          </div>
          {activeTab === "week" && plannedCount > 0 && (
            <button className="btn-reset" onClick={() => setShowResetConfirm(true)}>
              <Icons.Trash /> Wis planning
            </button>
          )}
          {activeTab === "week" && plannedCount === 0 && previousPlan && (
            <button className="btn-reset btn-reset-positive" onClick={kopieerVorigeWeek}>
              <Icons.Copy /> Vorige week
            </button>
          )}
        </header>

        {/* MAIN CONTENT */}
        <main className="content">
          
          {/* TAB: WEEKMENU */}
          {activeTab === "week" && (
            <div className="day-list">
              {DAGEN.map((dayName, index) => {
                const meal = plan[index];
                const isToday = index === todayIndex;
                return (
                  <div key={index} className="day-section">
                    <div className="day-label">
                      {dayName}
                      {isToday && <span className="today-tag"><Icons.Calendar /> Vandaag</span>}
                    </div>
                    {meal ? (
                      <div className={`card filled ${isToday ? 'today' : ''}`} onClick={() => { setNewIngInput(""); setDetailDay(index); }}>
                        <div className="card-top">
                          <h3 className="meal-title">{formatSentenceCase(meal.naam)}</h3>
                          <div className="meal-meta">
                            {meal.time && (
                              <>
                                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                  <Icons.Clock /> {meal.time}
                                </span>
                                <span>•</span>
                              </>
                            )}
                            <span>{meal.ings.length} ingrediënten</span>
                          </div>
                        </div>
                        <div style={{ color: 'var(--text-light)' }}><Icons.ChevronRight /></div>
                      </div>
                    ) : (
                      <div className={`card empty ${isToday ? 'today' : ''}`} onClick={() => openSheet(index)}>
                        <Icons.Plus /> Plan maaltijd
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: KOOKBOEK / GERECHTEN */}
          {activeTab === "recipes" && (
            <div>
              <div className="card empty" onClick={() => openRecipeForm(null)} style={{marginBottom: '16px'}}>
                <Icons.Plus /> Nieuw gerecht toevoegen
              </div>

              {/* Zoekbalk in Kookboek */}
              <div className="input-wrap" style={{ marginBottom: '20px' }}>
                <div className="input-icon"><Icons.Search /></div>
                <input
                  className="input"
                  placeholder="Zoek in je gerechten..."
                  value={recipeSearchQ}
                  onChange={(e) => setRecipeSearchQ(e.target.value)}
                />
              </div>

              <div>
                {filteredRecipes.map(m => (
                  <div key={m.id} className="card filled" style={{marginBottom: '12px', alignItems: 'center'}}>
                    <div className="card-top" style={{flex: 1}}>
                      <h3 className="meal-title">{formatSentenceCase(m.naam)}</h3>
                      <div className="meal-meta">
                        {m.time && (
                          <>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Icons.Clock /> {m.time}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{m.ings.length} ingrediënten</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-text" onClick={() => openRecipeForm(m)} style={{ padding: '8px' }}>
                        <Icons.Pen />
                      </button>
                      <button className="btn-text danger" onClick={() => setRecipeToDelete(m.id)} style={{ padding: '8px' }}>
                        <Icons.Trash />
                      </button>
                    </div>
                  </div>
                ))}
                {filteredRecipes.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: 32 }}>Geen gerechten gevonden.</p>
                )}
              </div>
            </div>
          )}

          {/* TAB: BOODSCHAPPENLIJST */}
          {activeTab === "list" && (
            <div>
              {!hasGroceries ? (
                <div className="empty-state" style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-light)" }}>
                  <div style={{ display: 'flex', justifyContent: 'center' }}><Icons.Bag /></div>
                  <h3 style={{ margin: '16px 0 8px', color: 'var(--primary)' }}>Lijst is leeg</h3>
                  <p>Plan maaltijden in om hier je ingrediënten te verzamelen.</p>
                </div>
              ) : (
                <div>
                  <div className="grocery-header">
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Je boodschappenlijst</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button className="btn-icon-ghost" onClick={() => setShowPantrySettings(true)} title="Voorraadkast instellen">
                        <Icons.Settings />
                      </button>
                      <button className="btn-copy" onClick={kopieerLijst}>
                        <Icons.Copy /> {copied ? "Gekopieerd!" : "Kopieer lijst"}
                      </button>
                    </div>
                  </div>

                  {/* Toggle Per dag / Totaallijst */}
                  <div className="toggle-wrap">
                    <button className={`toggle-btn ${listView === 'dag' ? 'active' : ''}`} onClick={() => setListView('dag')}>Per dag</button>
                    <button className={`toggle-btn ${listView === 'totaal' ? 'active' : ''}`} onClick={() => setListView('totaal')}>Totaallijst</button>
                  </div>

                  {/* Weergave Per Dag */}
                  {listView === "dag" && DAGEN.map((dayName, index) => {
                    const meal = plan[index];
                    if (!meal || !meal.ings || meal.ings.length === 0) return null;
                    const visibleIngs = hidePantryItems
                      ? meal.ings.filter(ing => !isPantryStaple(parseIngrediënt(ing).name, pantryStaples))
                      : meal.ings;
                    if (visibleIngs.length === 0) return null;
                    return (
                      <div key={index} className="grocery-section">
                        <div className="grocery-day">{dayName} <span style={{color: 'var(--text-light)', fontWeight: 400}}>– {formatSentenceCase(meal.naam)}</span></div>
                        <div className="card" style={{padding: '8px 20px'}}>
                          {meal.ings.map((ing, i) => {
                            const key = `${index}-${i}`; const isChecked = checkedItems[key];
                            const isPantry = isPantryStaple(parseIngrediënt(ing).name, pantryStaples);
                            if (hidePantryItems && isPantry) return null;
                            return (
                              <div key={i} className={`grocery-item ${isChecked ? 'checked' : ''} ${isPantry ? 'pantry' : ''}`} onClick={() => setCheckedItems(prev => ({...prev, [key]: !prev[key]}))}>
                                <div className="checkbox">{isChecked && <Icons.Check />}</div>
                                <div className="grocery-item-name" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                  {ing.toLowerCase()}
                                  {isPantry && <span className="pantry-tag"><Icons.Box /> op voorraad</span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}

                  {/* Weergave Gecombineerd -> Nu 'Totaallijst' */}
                  {listView === "totaal" && (
                    <div className="grocery-section">
                      <div className="card" style={{padding: '8px 20px'}}>
                        {groupedGroceries.map((group, i) => {
                          const isChecked = group.originalKeys.every(k => checkedItems[k]);
                          const isPantry = isPantryStaple(group.name, pantryStaples);
                          if (hidePantryItems && isPantry) return null;
                          const displayName = group.baseVal !== null
                            ? `${formatQuantity(group.baseVal, group.baseUnit)}${group.name}`
                            : group.name;
                          return (
                            <div key={i} className={`grocery-item ${isChecked ? 'checked' : ''} ${isPantry ? 'pantry' : ''}`} onClick={() => toggleGroupChecked(group)}>
                              <div className="checkbox">{isChecked && <Icons.Check />}</div>
                              <div className="grocery-item-name" style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                {displayName}
                                {isPantry && <span className="pantry-tag"><Icons.Box /> op voorraad</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </main>

        {/* NAVIGATION */}
        <nav className="bottom-nav">
          <button className={`nav-item ${activeTab === 'week' ? 'active' : ''}`} onClick={() => setActiveTab('week')}><Icons.Calendar />Menu</button>
          <button className={`nav-item ${activeTab === 'recipes' ? 'active' : ''}`} onClick={() => setActiveTab('recipes')}><Icons.Book />Gerechten</button>
          <button className={`nav-item ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>
            <div style={{ position: 'relative' }}><Icons.Bag />{hasGroceries && <span className="badge" />}</div>Lijst
          </button>
        </nav>

        {/* MEAL DETAIL SHEET */}
        <div className={`sheet-overlay ${detailDay !== null ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('sheet-overlay') && setDetailDay(null)}>
          <div className="sheet">
            <button className="sheet-close" onClick={() => setDetailDay(null)}><Icons.X /></button>
            {detailDay !== null && plan[detailDay] && (
              <>
                <div className="sheet-header" style={{ paddingBottom: '24px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-light)', textTransform: 'uppercase', marginBottom: '8px' }}>{DAGEN[detailDay]}</div>
                  <h2 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)', marginBottom: '12px' }}>{formatSentenceCase(plan[detailDay].naam)}</h2>
                  <div className="meal-meta" style={{ fontSize: '15px' }}>
                    {plan[detailDay].time && (
                      <>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <Icons.Clock /> {plan[detailDay].time}
                        </span>
                        <span>•</span>
                      </>
                    )}
                    <span>{plan[detailDay].ings.length} ingrediënten</span>
                  </div>
                </div>
                <div className="sheet-content" style={{ paddingTop: '24px' }}>
                  <div style={{ marginBottom: '32px' }}>
                    <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--primary)', marginBottom: '16px' }}>Ingrediënten</h4>
                    {plan[detailDay].ings.length > 0 && (
                      <div className="ing-list" style={{ marginBottom: '12px' }}>
                        {plan[detailDay].ings.map((ing, idx) => (
                          <div key={idx} className="ing-chip" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg)', borderRadius: '12px', padding: '4px 12px' }}>
                            <input
                              className="input"
                              style={{ flex: 1, padding: '8px 0', background: 'transparent', border: 'none', fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}
                              value={ing}
                              onChange={(e) => updatePlannedIng(detailDay, idx, e.target.value.toLowerCase())}
                            />
                            <button className="ing-chip-del" onClick={() => removePlannedIng(detailDay, idx)}>
                              <Icons.Trash />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="add-row">
                      <input
                        className="input"
                        placeholder="Ingrediënt toevoegen..."
                        value={newIngInput}
                        onChange={(e) => setNewIngInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { addPlannedIng(detailDay, newIngInput); setNewIngInput(""); } }}
                      />
                      <button className="btn-add" onClick={() => { addPlannedIng(detailDay, newIngInput); setNewIngInput(""); }}><Icons.Plus /></button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button className="btn-primary" onClick={() => { const d = detailDay; setDetailDay(null); setTimeout(() => openSheet(d), 300); }}><Icons.Pen /> Verander maaltijd</button>
                    <button className="btn-primary" style={{ background: 'var(--danger-light)', color: 'var(--danger)' }} onClick={() => removeMeal(detailDay)}><Icons.Trash /> Wis van planning</button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MAIN ADD SHEET */}
        <div className={`sheet-overlay ${sheetOpen ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('sheet-overlay') && closeSheet()}>
          <div className="sheet">
            <button className="sheet-close" onClick={closeSheet}><Icons.X /></button>
            <div className="sheet-header"><div className="sheet-title">Kies voor {activeDay !== null ? DAGEN[activeDay].toLowerCase() : ''}</div></div>

            <div className="sheet-tabs">
              <button className={`sheet-tab ${sheetMode === 'search' ? 'active' : ''}`} onClick={() => setSheetMode('search')}><Icons.Search /> Zoek</button>
              <button className={`sheet-tab ${sheetMode === 'modular' ? 'active' : ''}`} onClick={() => setSheetMode('modular')}><Icons.Grid /> Mix & Match</button>
              <button className={`sheet-tab ${sheetMode === 'ingredients' ? 'active' : ''}`} onClick={() => setSheetMode('ingredients')}><Icons.Leaf /> In huis</button>
              <button className={`sheet-tab ${sheetMode === 'surprise' ? 'active' : ''}`} onClick={() => setSheetMode('surprise')}><Icons.Shuffle /> Verras mij</button>
            </div>

            <div className="sheet-content">
              
              {/* MODULAR TAB */}
              {sheetMode === 'modular' && (
                <div>
                  <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '20px' }}>Stel zelf snel een klassieke maaltijd samen (combinatie mag vrijblijvend):</p>
                  <div className="modular-grid">
                    <div className="modular-row">
                      <span className="label">1. Basis / Koolhydraat</span>
                      <div className="chip-container">
                        {MODULAIR_DATA.basis.map(b => (
                          <button key={b} className={`chip ${modBasis === b ? 'selected' : ''}`} onClick={() => setModBasis(modBasis === b ? "" : b)}>{formatSentenceCase(b)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="modular-row">
                      <span className="label">2. Vlees / Vis / Proteïne</span>
                      <div className="chip-container">
                        {MODULAIR_DATA.eiwit.map(e => (
                          <button key={e} className={`chip ${modEiwit === e ? 'selected' : ''}`} onClick={() => setModEiwit(modEiwit === e ? "" : e)}>{formatSentenceCase(e)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="modular-row">
                      <span className="label">3. Groente</span>
                      <div className="chip-container">
                        {MODULAIR_DATA.groente.map(g => (
                          <button key={g} className={`chip ${modGroente === g ? 'selected' : ''}`} onClick={() => setModGroente(modGroente === g ? "" : g)}>{formatSentenceCase(g)}</button>
                        ))}
                      </div>
                    </div>
                    <div className="modular-row">
                      <span className="label">4. Saus</span>
                      <div className="chip-container">
                        {MODULAIR_DATA.saus.map(s => (
                          <button key={s} className={`chip ${modSaus === s ? 'selected' : ''}`} onClick={() => setModSaus(modSaus === s ? "" : s)}>{formatSentenceCase(s)}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button 
                    className="btn-primary" 
                    onClick={saveModularMeal} 
                    disabled={!modBasis && !modEiwit && !modGroente && !modSaus}
                  >
                    Voeg toe aan planning
                  </button>
                </div>
              )}

              {/* SEARCH TAB */}
              {sheetMode === 'search' && (
                <>
                  <div className="input-wrap">
                    <div className="input-icon"><Icons.Search /></div>
                    <input className="input has-sort" placeholder="Zoek een gerecht..." value={searchQ} onChange={(e) => setSearchQ(e.target.value)}/>
                    <button
                      className={`input-sort-btn ${sortByTime ? 'active' : ''}`}
                      onClick={() => setSortByTime(s => !s)}
                      title="Sorteer op bereidingstijd"
                    >
                      <Icons.Clock />
                    </button>
                  </div>
                  {searchResults.map(m => (
                    <div key={m.id} className="list-item" onClick={() => selectMeal(m)}>
                      <div className="list-item-content">
                        <div className="list-item-title">{formatSentenceCase(m.naam)}</div>
                        <div className="list-item-sub">
                          {m.time && (
                            <>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Icons.Clock /> {m.time}</span>
                              <span>•</span>
                            </>
                          )}
                          <span>{m.ings.length} ingrediënten</span>
                        </div>
                      </div>
                      <Icons.ChevronRight />
                    </div>
                  ))}
                </>
              )}

              {/* IN HOUSE TAB */}
              {sheetMode === 'ingredients' && (
                <>
                  <div className="input-wrap"><div className="input-icon"><Icons.Leaf /></div>
                    <input className="input" placeholder="Wat heb je in de koelkast?" value={ingQ} onChange={(e) => setIngQ(e.target.value.toLowerCase())}/>
                  </div>
                  {ingQ.trim() === "" ? <p style={{textAlign: 'center', color: 'var(--text-light)', marginTop: 32}}>Typ een ingrediënt om gerechten te vinden.</p> : 
                    <div>
                      {ingResults.map(m => (
                        <div key={m.id} className="list-item" onClick={() => selectMeal(m)}>
                          <div className="list-item-content">
                            <div className="list-item-title">{formatSentenceCase(m.naam)}</div>
                            <div className="list-item-sub">
                              {m.time && (
                                <>
                                  <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}><Icons.Clock /> {m.time}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{m.ings.length} ingrediënten</span>
                            </div>
                          </div>
                          <Icons.ChevronRight />
                        </div>
                      ))}
                    </div>
                  }
                </>
              )}

              {/* SURPRISE TAB */}
              {sheetMode === 'surprise' && (
                <div className="surprise-container" style={{ textAlign: 'center', padding: '24px 20px' }}>
                  <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px' }}>Geen inspiratie? Laat ons een maaltijd kiezen die je nog niet gepland hebt.</p>
                  <button className="btn-primary" onClick={verrasMij} disabled={surpriseLoading}>{surpriseLoading ? "Kiezen..." : "Verras mij!"}</button>
                  {surpriseRes && (
                    <div style={{ background: 'var(--bg)', borderRadius: '16px', padding: '24px', marginTop: '16px', textAlign: 'left', border: '1px solid var(--border)' }}>
                      <h4 style={{ fontSize: 18, marginBottom: 8, fontWeight: 600, color: 'var(--primary)' }}>{formatSentenceCase(surpriseRes.naam)}</h4>
                      <div className="meal-meta" style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                        {surpriseRes.time && (
                          <>
                            <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                              <Icons.Clock /> {surpriseRes.time}
                            </span>
                            <span>•</span>
                          </>
                        )}
                        <span>{surpriseRes.ings ? surpriseRes.ings.length : 0} ingrediënten</span>
                      </div>
                      <button className="btn-primary" style={{ background: 'var(--accent)' }} onClick={() => selectMeal(surpriseRes)}>Plan dit in</button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* PANTRY STAPLES SETTINGS SHEET */}
        <div className={`sheet-overlay ${showPantrySettings ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('sheet-overlay') && setShowPantrySettings(false)}>
          <div className="sheet">
            <button className="sheet-close" onClick={() => setShowPantrySettings(false)}><Icons.X /></button>
            <div className="sheet-header">
              <div className="sheet-title">Voorraadkast</div>
            </div>
            <div className="sheet-content">
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Ingrediënten die je altijd in huis hebt. Deze worden op je boodschappenlijst gemarkeerd als "op voorraad".
              </p>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px', background: 'var(--bg)', borderRadius: '12px', marginBottom: '20px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-main)' }}>Verberg deze items op de lijst</span>
                <button
                  onClick={() => setHidePantryItems(p => !p)}
                  style={{
                    width: 40, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: hidePantryItems ? 'var(--accent)' : 'var(--border-dark)',
                    position: 'relative', transition: 'background 0.2s', flexShrink: 0
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3, left: hidePantryItems ? 19 : 3,
                    transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }} />
                </button>
              </div>

              <div className="add-row">
                <input
                  className="input"
                  placeholder="Bijv. paprikapoeder"
                  value={pantryInput}
                  onChange={(e) => setPantryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addPantryStaple()}
                />
                <button className="btn-add" onClick={addPantryStaple}><Icons.Plus /></button>
              </div>
              <div className="pantry-list">
                {pantryStaples.length === 0 && (
                  <p style={{ textAlign: 'center', color: 'var(--text-light)', marginTop: 24 }}>Nog geen items toegevoegd.</p>
                )}
                {pantryStaples.map((item) => (
                  <div key={item} className="pantry-row">
                    <span>{item}</span>
                    <button className="ing-chip-del" onClick={() => removePantryStaple(item)}>
                      <Icons.Trash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RECIPE EDIT SHEET */}
        <div className={`sheet-overlay ${editingRecipe ? 'open' : ''}`} onClick={(e) => e.target.classList.contains('sheet-overlay') && setEditingRecipe(null)}>
          <div className="sheet">
            <button className="sheet-close" onClick={() => setEditingRecipe(null)}><Icons.X /></button>
            <div className="sheet-header">
              <div className="sheet-title">{editingRecipe === 'new' ? 'Nieuw gerecht' : 'Gerecht bewerken'}</div>
            </div>
            <div className="sheet-content">
              <div className="form-group">
                <label className="label">Naam van het gerecht *</label>
                <input
                  className="input"
                  placeholder="Bijv. Mama's ovenschotel"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  style={{ paddingLeft: 14 }}
                />
              </div>
              <div className="form-group">
                <label className="label">Bereidingstijd (optioneel)</label>
                <div className="time-input-wrap">
                  <input
                    className="time-input"
                    type="number"
                    placeholder="Bijv. 30"
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                  />
                  <span className="time-unit">min</span>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Ingrediënten</label>

                {/* Direct invulbare ingrediëntenlijst */}
                {customIngs.length > 0 && (
                  <div className="ing-list" style={{ marginBottom: '16px' }}>
                    {customIngs.map((ing, i) => (
                      <div key={i} className="ing-chip" style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'var(--bg)', borderRadius: '12px', padding: '4px 12px' }}>
                        <input
                          className="input"
                          style={{
                            flex: 1, padding: '8px 0', background: 'transparent', border: 'none',
                            fontSize: '14px', color: 'var(--text-main)', fontWeight: '500'
                          }}
                          value={ing}
                          onChange={(e) => {
                            const updated = [...customIngs];
                            // Forceer ook hier altijd kleine letters
                            updated[i] = e.target.value.toLowerCase();
                            setCustomIngs(updated);
                          }}
                          placeholder={`Ingrediënt ${i + 1}`}
                        />
                        <button className="ing-chip-del" onClick={() => setCustomIngs(p => p.filter((_, j) => j !== i))} style={{ padding: '8px' }}>
                          <Icons.Trash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="add-row">
                  <input
                    className="input"
                    placeholder="Nieuw ingrediënt toevoegen..."
                    value={customIngInput}
                    onChange={(e) => setCustomIngInput(e.target.value.toLowerCase())}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomIng()}
                  />
                  <button className="btn-add" onClick={addCustomIng}><Icons.Plus /></button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                <button className="btn-modal-secondary" onClick={() => setEditingRecipe(null)}>Annuleer</button>
                <button className="btn-primary" onClick={saveRecipe} disabled={!customName.trim()}>Sla op</button>
              </div>
            </div>
          </div>
        </div>

        {/* CLEAR CONFIRM MODAL */}
        {showResetConfirm && (
          <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 8 }}>Weekmenu wissen?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Weet je zeker dat je het menu en de boodschappenlijst wilt resetten?</p>
              <div className="modal-buttons">
                <button className="btn-modal-secondary" onClick={() => setShowResetConfirm(false)}>Annuleer</button>
                <button className="btn-modal-danger" onClick={executeResetWeek}>Wis alles</button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE RECIPE CONFIRM MODAL */}
        {recipeToDelete && (
          <div className="modal-overlay" onClick={() => setRecipeToDelete(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h3 style={{ marginBottom: 8 }}>Gerecht verwijderen?</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 20 }}>Weet je zeker dat je dit gerecht uit je kookboek wilt verwijderen?</p>
              <div className="modal-buttons">
                <button className="btn-modal-secondary" onClick={() => setRecipeToDelete(null)}>Annuleer</button>
                <button className="btn-modal-danger" onClick={executeDeleteRecipe}>Verwijder</button>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
