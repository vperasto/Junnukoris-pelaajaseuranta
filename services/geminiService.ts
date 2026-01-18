
import { GoogleGenAI } from "@google/genai";
import { Player, GameEvent } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getCoachAdvice = async (
  players: Player[],
  events: GameEvent[],
  period: number,
  gameMode: number
): Promise<string> => {
  try {
    // Filter out injured players from the active roster consideration
    const activePlayers = players.filter(p => !p.isInjured && !p.isFouledOut);
    const injuredPlayers = players.filter(p => p.isInjured);

    const rosterSummary = activePlayers.map(p => 
      `- #${p.number} ${p.name}: ${Math.floor(p.secondsPlayed / 60)}m ${p.secondsPlayed % 60}s (${p.isOnCourt ? 'KENTÄLLÄ' : 'PENKILLÄ'})`
    ).join('\n');

    const injuredSummary = injuredPlayers.length > 0 
      ? `\nLoukkaantuneet (EI PELIKUNNOSSA - ÄLÄ EHDOTA KENTÄLLE): ${injuredPlayers.map(p => p.name).join(', ')}` 
      : "";

    const recentEvents = events.slice(-5).map(e => `[Erä ${e.period} - ${e.timestamp}] ${e.description}`).join('\n');

    const prompt = `
      Olet juniorikoripallovalmentajan apulainen. Analysoi tilanne ja anna lyhyt, kannustava neuvo (max 3 lausetta).
      
      PELITILANNE:
      - Erä: ${period}
      - Pelimuoto: ${gameMode} vs ${gameMode}
      - Viimeisimmät tapahtumat:
      ${recentEvents}

      PELAAJAT:
      ${rosterSummary}
      ${injuredSummary}

      OHJEET:
      - Tavoite: Tasainen peliaika kaikille toimintakykyisille pelaajille.
      - Huomioi, jos joku on pelannut selvästi vähemmän kuin muut ja ehdota häntä kentälle.
      - ÄLÄ huomioi loukkaantuneita pelaajia peliaikavertailussa tai ehdota heitä kentälle.
      - Jos vaihtoja on tehty vähän, muistuta vaihtamisesta.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Ei neuvoja tällä hetkellä.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Tekoäly ei ole tavoitettavissa juuri nyt.";
  }
};

export const generateGameSummaryForParents = async (
  opponent: string,
  notes: string,
  players: Player[],
  tone: 'EXCITED' | 'OFFICIAL' | 'ANALYTICAL'
): Promise<string> => {
    try {
        const stats = players.map(p => 
            `${p.name}: ${Math.floor(p.secondsPlayed / 60)} min`
        ).join(', ');

        const injured = players.filter(p => p.isInjured).map(p => p.name).join(', ');
        const injuredTxt = injured ? ` (Loukkaantumiset: ${injured})` : "";

        let toneInstruction = "";
        switch (tone) {
            case 'OFFICIAL':
                toneInstruction = "Kirjoita asiallinen, ytimekäs ja informatiivinen viesti. Vältä liiallista hehkutusta tai emojeita. Kerro faktat selkeästi.";
                break;
            case 'ANALYTICAL':
                toneInstruction = "Kirjoita analyyttinen viesti, joka korostaa oppimista ja pelitavallisia asioita. Mainitse joukkueen kehityskohteet tai onnistumiset taktisesti.";
                break;
            case 'EXCITED':
            default:
                toneInstruction = "Kirjoita erittäin energinen, iloinen ja 'Kobrat'-henkinen viesti. Käytä reilusti emojeita (koripallo, käärme, tuli). Korosta fiilistä ja yrittämistä!";
                break;
        }

        const prompt = `
          Kirjoita viesti juniorijoukkueen vanhempien WhatsApp-ryhmään pelin jälkeen.
          
          TIEDOT:
          - Vastustaja: ${opponent}
          - Valmentajan huomiot/muistiinpanot pelistä: ${notes}
          - Peliajat (taustatietoa sinulle, älä luettele kaikkia ellei pyydetä): ${stats}
          - Erityishuomiot: ${injuredTxt}

          TYYLIOHJE (${tone}):
          ${toneInstruction}

          YLEISET OHJEET:
          - Jos peliaika jakaantui tasaisesti, mainitse se positiivisena asiana.
          - Jos oli loukkaantumisia, toivota pikaista paranemista.
          - Viestin pituus max 100 sanaa.
          - Aloita viesti kertomalla ketä vastaan pelattiin.
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text || "Kiitos kaikille hienosta pelistä! Tsemppiä Kobrat!";
    } catch (error) {
        return "Peli päättyi. Hyvä tsemppi Kobrat!";
    }
};
