import { LEGAL } from '@/config/legal'

// Política de privacitat. REGLA: diu el que fa el codi. Si s'afegeix un
// proveïdor (correu, analítica…), una dada nova o es canvia qui veu què, cal
// canviar aquest text en el mateix canvi (i la data de LEGAL.privacyUpdatedOn).

export type PrivacySection = { title: string; paragraphs: string[]; items?: string[] }

export const privacyPolicy: { title: string; intro: string; sections: PrivacySection[] } = {
  title: 'Política de privacitat',
  intro:
    'Sobretaula és una app privada i sense ànim de lucre per valorar, en grup, els restaurants on aneu. Només s\'hi pot entrar amb una invitació. Aquí t\'expliquem quines dades fa servir i per a què.',
  sections: [
    {
      title: 'Qui en és responsable',
      paragraphs: [
        `Sobretaula és un projecte personal. Per a qualsevol qüestió sobre les teves dades, escriu a ${LEGAL.contactEmail}.`,
      ],
    },
    {
      title: 'Quines dades fem servir',
      paragraphs: ['Només les necessàries perquè l\'app funcioni:'],
      items: [
        'Del teu compte de Google, en entrar: el nom, el correu electrònic i la foto de perfil. El correu no el veu cap altre usuari.',
        'El que tu hi poses: el nom i l\'avatar que tries, els grups on ets, els restaurants i les visites, els teus vots, els teus comentaris i les notes del grup.',
        'Registres tècnics (com l\'adreça IP) que els nostres proveïdors guarden uns dies per seguretat i per fer funcionar el servei.',
      ],
    },
    {
      title: 'Per a què',
      paragraphs: [
        'Per identificar-te, fer funcionar els grups, les sales de votació i els rànquings, i res més. No hi ha publicitat, no venem ni cedim dades a ningú, i no fem servir analítica ni galetes de seguiment. Les úniques galetes són tècniques: la de la sessió i la que recorda l\'últim grup que has obert.',
        'La base legal és la prestació del servei que demanes en entrar i fer-lo servir.',
      ],
    },
    {
      title: 'Qui veu què',
      paragraphs: [],
      items: [
        'Les teves valoracions, comentaris i visites només les veuen els membres del grup on les has fet. Els d\'un altre grup no en veuen res, encara que comparteixin alguna persona amb tu.',
        'Mentre es vota, ningú (ni tan sols l\'amfitrió) pot veure el teu vot fins que es revela.',
        'Els altres usuaris només veuen el teu nom i el teu avatar si compartiu grup o heu votat junts.',
        'Cada grup només veu els restaurants on ha anat.',
      ],
    },
    {
      title: 'On es guarden',
      paragraphs: ['Fem servir aquests proveïdors, que tracten les dades en nom nostre:'],
      items: [
        'Supabase: base de dades i inici de sessió. Servidors a Irlanda (Unió Europea).',
        'Vercel: allotjament de la web.',
        'Google: inici de sessió amb el teu compte.',
      ],
    },
    {
      title: 'Quant de temps',
      paragraphs: [
        'Mentre tinguis el compte. Si surts d\'un grup, els teus vots es queden a l\'historial d\'aquell grup perquè el rànquing no canviï.',
        'L\'amfitrió d\'una visita o un admin del grup la poden esborrar (per exemple, una de prova): llavors s\'esborren al moment tots els vots i comentaris d\'aquella visita, i el restaurant, si cap grup més no hi ha anat.',
        'Si esborres el compte (Perfil → Ajustos → Esborrar el compte), esborrem al moment les teves dades d\'accés (el correu inclòs) i els teus comentaris, i surts de tots els grups. El teu perfil passa a ser anònim («Antic membre») i els vots de les sales ja revelades es conserven sense el teu nom, perquè l\'historial dels grups no canviï. Els vots d\'una sala que encara no s\'havia revelat s\'esborren. Si eres l\'última persona d\'un grup, el grup s\'esborra sencer.',
      ],
    },
    {
      title: 'Els teus drets',
      paragraphs: [
        `Pots canviar el teu nom i el teu avatar, i esborrar el compte, des de l'app. Per accedir a les teves dades, demanar-ne una còpia, corregir-les o oposar-te al seu ús, escriu a ${LEGAL.contactEmail} i ho farem en un màxim de 30 dies.`,
        'Si creus que no les tractem bé, pots reclamar a l\'Agència Espanyola de Protecció de Dades (aepd.es).',
      ],
    },
  ],
}
