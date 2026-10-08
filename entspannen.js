// 🛋️ Entspannen: the app does the thinking. Julia picks how much time she has and how she feels,
// the app picks ONE ritual. Her ratings (😍 🙂 😕), what she did lately, what she has prepared
// and the time of day steer the pick. Her own rituals join the same pool (and come up more often).
//
// size: kurz (5–15 Min.) · abend (30 Min. bis open end) · besonders (was Besonderes, eher planen)
// en: which energy it fits — p = platt 🫠, o = geht so 🙂, f = hab noch Saft ⚡
// tags: out (draußen → spät abends seltener), night (gerade abends schön), bed (kurz vorm Schlafen), duo (mit {p}, dem Partner)
// prep: a preparation from content.js PREPS that makes it easier (preferred once it's done)
// {p} in a text becomes the partner's nickname.

export const SIZES = [['kurz', '⚡', 'Kurz', '5–15 Min.'], ['abend', '🌙', 'Ein Abend', 'ab 30 Min.'], ['besonders', '✨', 'Was Besonderes', 'zum Freuen & Planen']];
export const ENERGY = [['p', '🫠', 'Platt'], ['o', '🙂', 'Geht so'], ['f', '⚡', 'Hab noch Saft']];
export const STARS = 2;

const r = (size, id, icon, title, en, x = {}) => Object.assign({ size, id, icon, title, en }, x);

export const RITUALS = [
  // ---------- ⚡ kurz: 5–15 Minuten ----------
  r('kurz', 'tee', '🫖', 'Tee-Pause am Fenster', 'po', { prep: 'kiste', text: 'Nur trinken und gucken. Sonst nichts.',
    steps: ['Wasser aufsetzen', 'Lieblingstee oder Kakao aus der Kuschelkiste', 'Die schöne Tasse nehmen', 'Fensterplatz oder Balkon', '10 Minuten nur trinken und gucken'], mini: ['Tee machen', '2 Minuten aus dem Fenster schauen'] }),
  r('kurz', 'dreilieder', '🎧', 'Drei Lieder mit geschlossenen Augen', 'po', { text: 'Hinlegen, Kopfhörer, Augen zu. Drei Lieder lang darf die Welt warten.',
    steps: ['Kopfhörer holen', 'Ein ruhiges Lieblingslied anmachen', 'Hinlegen oder einkuscheln', 'Augen zu – drei Lieder lang'] }),
  r('kurz', 'creme', '🧴', 'Hände eincremen mit der guten Creme', 'po', { text: 'Langsam, jeder Finger einzeln. Und einmal dran riechen.' }),
  r('kurz', 'schoki', '🍫', 'Ein Stück richtig gute Schokolade', 'po', { text: 'Nicht kauen – auf der Zunge schmelzen lassen. Ganz bewusst.' }),
  r('kurz', 'kerze', '🕯️', 'Kerze an, großes Licht aus', 'po', { tags: ['night'], text: 'Eine Kerze, gedimmtes Licht, fünf Minuten in die Flamme schauen.' }),
  r('kurz', 'luft', '🌬️', 'Fenster auf, fünf tiefe Atemzüge', 'pof', { text: 'Frische Luft ins Gesicht.',
    steps: ['Fenster weit auf', 'Fünfmal tief durch die Nase ein, langsam durch den Mund aus', 'Gesicht kurz in die kühle Luft halten'] }),
  r('kurz', 'fussbad', '🦶', 'Warmes Fußbad', 'po', { prep: 'kiste', text: 'Warme Füße, warmer Kopf.',
    steps: ['Schüssel mit warmem Wasser', 'Etwas Salz oder Duftöl rein', 'Handtuch daneben legen', 'Füße rein – 10 Minuten', 'Danach Kuschelsocken an'] }),
  r('kurz', 'dusche', '🚿', 'Heiße Dusche, ganz langsam', 'po', { text: 'Keine Eile, kein Haarewaschen-Stress. Nur warmes Wasser.', mini: ['Hände und Unterarme unter warmes Wasser halten'] }),
  r('kurz', 'burrito', '🌯', 'In die Decke wickeln wie ein Burrito', 'p', { text: 'Fest einwickeln, nur die Nase guckt raus. 10 Minuten Pause, offiziell.' }),
  r('kurz', 'hundekraulen', '🐶', 'Hunde-Pause: 10 Minuten nur kraulen', 'po', { text: 'Kein Handy. Nur du, der Hund und sein weiches Fell.' }),
  r('kurz', 'fotos', '📸', 'Durch schöne alte Fotos scrollen', 'po', { text: 'Ein Lieblingsalbum, ein Urlaub, ein guter Tag von früher.' }),
  r('kurz', 'liebesnachricht', '💌', 'Einer Freundin was Liebes schreiben', 'of', { text: 'Ohne Grund. Einfach, weil du an sie denkst.' }),
  r('kurz', 'sonne', '🌤️', '10 Minuten Sonne auf dem Balkon', 'of', { tags: ['out'], text: 'Gesicht in die Sonne (oder ins Licht), Augen zu.' }),
  r('kurz', 'mitsingen', '🎤', 'Ein Lied laut mitsingen', 'of', { text: 'Je schiefer, desto besser.' }),
  r('kurz', 'kuechentanz', '💃', 'Ein Lied lang durch die Küche tanzen', 'f', { text: 'Lieblingslied laut, Socken an, los.' }),
  r('kurz', 'dehnen', '🙆', 'Fünf Minuten dehnen', 'of', { text: 'Der Körper sagt danke.',
    steps: ['Arme ganz hoch strecken, lang machen', 'Nacken langsam kreisen lassen', 'Im Stehen vorbeugen, Oberkörper hängen lassen', 'Schultern zehnmal nach hinten kreisen'] }),
  r('kurz', 'maske', '🧖', 'Gesichtsmaske, 10 Minuten', 'po', { prep: 'kiste', text: 'Maske drauf, hinlegen, Augen zu, bis der Wecker klingelt.' }),
  r('kurz', 'honigmilch', '🥛', 'Warme Milch mit Honig', 'po', { tags: ['bed'], text: 'Wie früher. Mit beiden Händen um die Tasse.' }),
  r('kurz', 'wolken', '☁️', 'Wolken gucken', 'po', { text: 'Aus dem Fenster oder vom Balkon. Was siehst du in ihnen?' }),
  r('kurz', 'kapitel', '📖', 'Ein Kapitel im Lieblingsbuch', 'po', { prep: 'nook', text: 'Nur eins. (Okay, vielleicht zwei.)' }),
  r('kurz', 'dreischoen', '✍️', 'Drei schöne Dinge von heute aufschreiben', 'o', { tags: ['night'], text: 'Auch kleine zählen: ein guter Kaffee, ein Lachen, Sonne.' }),
  r('kurz', 'kritzeln', '🖍️', '10 Minuten kritzeln, ohne Ziel', 'of', { text: 'Kreise, Muster, Blümchen. Es muss nichts werden.' }),
  r('kurz', 'blumen', '💐', 'Blumen oder Zweige in eine Vase', 'of', { text: 'Etwas Lebendiges auf den Tisch.' }),
  r('kurz', 'podcast', '🎙️', 'Eine Folge Lieblingspodcast im Liegen', 'po', { text: 'Hinlegen, zuhören, nichts nebenbei machen.' }),
  r('kurz', 'waermflasche', '♨️', 'Mit Wärmflasche aufs Sofa', 'p', { text: 'Wärmflasche auf den Bauch, Decke drüber. Fertig.' }),
  r('kurz', 'obst', '🍓', 'Obst schön aufschneiden und langsam essen', 'o', { text: 'Auf einem schönen Teller, wie im Hotel.' }),
  r('kurz', 'mocktail', '🍹', 'Ein Mocktail aus dem Kochbuch', 'of', { text: 'Im Kochbuch unter 🍹 Drinks. Mit Eis und schönem Glas.' }),
  r('kurz', 'kopfmassage', '💆', 'Kopfhaut-Massage, selbst gemacht', 'po', { text: 'Zwei Minuten, die sich wie zehn anfühlen.',
    steps: ['Finger in die Haare', 'Kleine Kreise vom Nacken bis zur Stirn', 'Zwei Minuten lang', 'Schultern sinken lassen'] }),
  r('kurz', 'beinewand', '🧘', 'Beine an die Wand, 5 Minuten', 'p', { text: 'Gut für müde Beine und einen vollen Kopf.',
    steps: ['Kissen unter den Po', 'Beine an die Wand legen', 'Augen zu', 'Fünf Minuten nur atmen'] }),
  r('kurz', 'hoerbuch', '🌙', 'Augen zu, ein Hörbuch-Kapitel', 'p', { tags: ['bed'], text: 'Lass dir vorlesen.' }),
  r('kurz', 'ausmalen', '🎨', 'Ein Ausmalbild', 'o', { text: 'Buntstifte, ein Mandala oder ein Tier. Hirn aus, Farbe an.' }),
  r('kurz', 'raetsel', '🧩', 'Ein kleines Rätsel', 'o', { text: 'Kreuzworträtsel, Sudoku oder ein Wortspiel.' }),
  r('kurz', 'umarmung', '🤗', 'Eine lange Umarmung von {p}', 'pof', { tags: ['duo'], text: 'Mindestens 20 Sekunden. Nicht vorher loslassen!' }),
  r('kurz', 'anruf', '📞', 'Kurz jemanden anrufen, der dir guttut', 'f', { text: 'Fünf Minuten Quatschen mit einem Lieblingsmenschen.' }),
  r('kurz', 'kaffee', '☕', 'Kaffee in der Lieblingstasse, ganz in Ruhe', 'o', { text: 'Hinsetzen. Nicht nebenbei trinken.' }),
  r('kurz', 'pflanzen', '🪴', 'Pflanzen besprühen und anschauen', 'o', { text: 'Wer hat ein neues Blatt? Kurz gratulieren.' }),
  r('kurz', 'powernap', '😴', 'Powernap mit Wecker', 'p', { text: 'Dösen zählt auch.',
    steps: ['Wecker auf 15 Minuten', 'Hinlegen, Decke drüber', 'Augen zu – nichts müssen'] }),
  r('kurz', 'nudelrush', '🍜', 'Ein paar Runden Nudel-Rush', 'of', { text: 'Ganz unten auf Home. Nur zum Spaß, keine Sterne, kein Druck.' }),
  r('kurz', 'folge', '📺', 'Eine Folge Lieblingsserie', 'po', { prep: 'filme', text: 'Genau eine. Mit Decke.' }),
  r('kurz', 'stille', '🤫', 'Fünf Minuten Stille', 'po', { text: 'Kein Handy, keine Musik. Nur sitzen und hören, was da ist.' }),
  r('kurz', 'kuschelsocken', '🧦', 'Kuschelsocken und Lieblingspulli an', 'p', { text: 'Uniform für den Feierabend.' }),
  r('kurz', 'sterne', '🌌', 'Mond und Sterne vom Balkon anschauen', 'o', { tags: ['night'], text: 'Jacke über, Kopf in den Nacken.' }),
  r('kurz', 'album', '💿', 'Ein Lieblingsalbum, Seite A', 'po', { text: 'Ein paar Lieder am Stück, wie früher von der Platte.' }),
  r('kurz', 'duftoel', '🌿', 'Duftöl auf ein Tuch und tief einatmen', 'po', { text: 'Lavendel, Orange oder was du magst.' }),
  r('kurz', 'kakao', '🍫', 'Kakao mit Sahne', 'po', { prep: 'kiste', text: 'Sahne obendrauf ist Pflicht.' }),
  r('kurz', 'gesichtwasser', '💧', 'Gesicht mit kühlem Wasser erfrischen', 'pof', { text: 'Danach die gute Creme. Fühlt sich an wie neu.' }),
  r('kurz', 'lieblingsfoto', '🖼️', 'Ein Lieblingsfoto anschauen und schmunzeln', 'p', { text: 'Das eine Foto, bei dem du immer lächeln musst.' }),

  // ---------- 🌙 ein Abend ----------
  r('abend', 'leseecke', '📚', 'Leseecke-Abend', 'po', { prep: 'nook', text: 'Buch, Decke, Getränk, warmes Licht. Handy in einen anderen Raum.',
    steps: ['Buch bereitlegen', 'Decke und Kissen in die Leseecke', 'Lieblingsgetränk machen', 'Licht gemütlich: Lampe, Lichterkette oder Kerze', 'Ruhige Musik an (oder Stille)', 'Handy in einen anderen Raum'], mini: ['Getränk machen', '10 Seiten lesen'] }),
  r('abend', 'bad', '🛁', 'Badewannen-Abend', 'po', { prep: 'kiste', text: 'Heißes Wasser, Duft, Kerze. Und das Handtuch wartet schon warm.',
    steps: ['Wanne einlassen', 'Badezusatz oder Duftöl rein', 'Musik, Hörbuch oder Podcast an', 'Handtuch auf die Heizung', 'Kerze an, großes Licht aus'], mini: ['Heiße Dusche', 'Danach die gute Creme'] }),
  r('abend', 'film', '🎬', 'Film-Nest', 'po', { prep: 'filme', text: 'Der Film ist schon ausgesucht (Film-Liste!). Du musst nur noch reinfallen.',
    steps: ['Film von der Film-Liste aussuchen', 'Snack auf einen Teller', 'Decke und Kissen aufs Sofa', 'Licht dimmen', 'Handy weg – Film ab'], mini: ['Eine Folge statt Film', 'Decke'] }),
  r('abend', 'musik', '🎧', 'Musik & Decke', 'p', { prep: 'playlist', text: 'Die Wohlfühl-Playlist, eine Decke, nichts müssen.',
    steps: ['Wohlfühl-Playlist starten', 'Decke holen', 'Getränk daneben stellen', 'Hinlegen oder einkuscheln', 'Augen zu für drei Lieder'], mini: ['Ein Lieblingslied', 'Augen zu'] }),
  r('abend', 'draussen', '🌿', 'Draußen-Pause', 'of', { tags: ['out'], text: 'Raus, ein Getränk in der Hand, Lieblingsrunde oder Lieblingsbank.',
    steps: ['Jacke an', 'Getränk zum Mitnehmen', 'Lieblingsrunde oder Lieblingsbank', 'Musik oder Podcast – oder einfach Vögel'], mini: ['5 Minuten auf den Balkon oder vor die Tür'] }),
  r('abend', 'spa', '🧖', 'Spa-Abend zu Hause', 'o', { prep: 'kiste', text: 'Wie im Wellnesshotel, nur mit Jogginghose.',
    steps: ['Bad oder Dusche schön warm machen', 'Gesichtsmaske auf', 'Fußbad mit Duftöl', 'Danach die gute Creme überall', 'Bademantel oder Kuschelpulli, Tee dazu'], mini: ['Gesichtsmaske', 'Gute Creme'] }),
  r('abend', 'naegel', '💅', 'Nägel machen mit Serie', 'o', { text: 'Eine Folge, ein schöner Lack, keine Eile.' }),
  r('abend', 'bestellen', '🥡', 'Lieblingsessen bestellen – heute kocht keiner', 'pof', { text: 'Kein Kochen, kein Abwasch. Nur genießen.',
    steps: ['Lieblingsessen bestellen', 'Teller statt Pappschachtel (es ist ein Anlass!)', 'Gemütlich hinsetzen', 'Handy weg beim Essen'] }),
  r('abend', 'backen', '🧁', 'Etwas backen, nur für dich', 'f', { text: 'Muffins, Bananenbrot, Kekse – und der Duft in der Wohnung gehört dir.' }),
  r('abend', 'kreativ', '🎨', 'Kreativ-Abend', 'of', { text: 'Malen, basteln, Collage kleben. Ohne Ziel, nur mit Freude.',
    steps: ['Tisch frei machen', 'Stifte, Farben oder Schere und alte Zeitschriften', 'Musik an', 'Eine Stunde machen, was die Hände wollen'] }),
  r('abend', 'puzzle', '🧩', 'Puzzle mit Hörbuch', 'o', { text: 'Ein paar Teile finden, nebenbei eine Geschichte hören.' }),
  r('abend', 'spieleabend', '🎲', 'Spieleabend mit {p}', 'of', { tags: ['duo'], text: 'Karten, Brettspiel oder Konsole – Snacks sind Pflicht.' }),
  r('abend', 'spaziergang', '🚶', 'Abendspaziergang zur Lieblingsecke', 'of', { tags: ['out'], text: 'Eine Runde, die dir gefällt. Vielleicht mit Hund.' }),
  r('abend', 'mocktailbar', '🍸', 'Mocktail-Bar zu Hause', 'f', { text: 'Zwei Drinks aus dem Kochbuch mixen, schöne Gläser, Musik.' }),
  r('abend', 'hoerbuchabend', '🎧', 'Hörbuch-Abend mit Decke', 'p', { text: 'Hinlegen, zuhören, vielleicht einschlafen. Alles erlaubt.' }),
  r('abend', 'fruehinsbett', '🛏️', 'Früh ins Bett mit Buch', 'p', { tags: ['bed', 'night'], text: 'Der beste Luxus: Schlaf, auf den man sich freut.',
    steps: ['Um 21 Uhr Zähne putzen', 'Kissen aufschütteln', 'Nur die Nachttischlampe an', 'Buch statt Handy – das Handy liegt woanders'] }),
  r('abend', 'serie', '📺', 'Serien-Abend, offiziell erlaubt', 'p', { prep: 'filme', text: 'Drei Folgen, ein Snack, eine Decke. Kein schlechtes Gewissen.' }),
  r('abend', 'kakaofilm', '🍿', 'Kakao, Popcorn und ein Lieblingsfilm', 'po', { prep: 'filme', text: 'Einer, den du schon kennst und liebst. Das zählt als Pflege.' }),
  r('abend', 'yoga', '🧘', 'Yoga oder Dehn-Video, 30 Minuten', 'of', { text: 'Ein ruhiges Video, eine Matte oder ein Teppich.' }),
  r('abend', 'tagebuch', '📔', 'Tagebuch-Abend mit Tee', 'o', { text: 'Was war los, was hat gutgetan, worauf freust du dich?' }),
  r('abend', 'kerzenabend', '🕯️', 'Abend ohne Bildschirm', 'o', { tags: ['night'], text: 'Kerzen an, Bildschirme aus. Lesen, reden, Musik.',
    steps: ['Handy und Fernseher aus', 'Kerzen oder Lichterkette an', 'Getränk machen', 'Lesen, reden oder einfach Musik hören'] }),
  r('abend', 'zusammenkochen', '🍳', 'Gemütlich zusammen kochen', 'f', { tags: ['duo'], text: 'Mit {p}, Musik und einem Rezept aus dem Kochbuch. Der Weg ist das Ziel.' }),
  r('abend', 'sonnenuntergang', '🌅', 'Sonnenuntergang anschauen', 'of', { tags: ['out'], text: 'Ein Platz mit Blick, ein Getränk, und dann zuschauen.' }),
  r('abend', 'massagetausch', '💆', 'Massage-Tausch mit {p}', 'po', { tags: ['duo'], text: 'Zehn Minuten du, zehn Minuten {p}. Oder zwanzig Minuten du. 😉' }),
  r('abend', 'langeranruf', '☎️', 'Langer Anruf mit einer Freundin', 'of', { text: 'Mit Tee auf dem Sofa, so lange es eben dauert.' }),
  r('abend', 'karaoke', '🎤', 'Karaoke in der Küche', 'f', { text: 'Songtexte auf dem Handy, Kochlöffel als Mikro.' }),
  r('abend', 'umtopfen', '🌱', 'Pflanzen umtopfen', 'f', { text: 'Hände in die Erde. Erdet wirklich.' }),
  r('abend', 'hunderunde', '🐕', 'Lange Runde mit dem Hund', 'of', { tags: ['out'], text: 'Die schöne Strecke, nicht die schnelle.' }),
  r('abend', 'pizzaabend', '🍕', 'Pizza-Abend: selbst belegen', 'of', { text: 'Fertigteig, alles was der Kühlschrank hergibt, Ofen an.' }),
  r('abend', 'neuemusik', '🎶', 'Neue Musik entdecken auf dem Sofa', 'po', { text: 'Ein Album, das du noch nicht kennst. Von vorne bis hinten.' }),
  r('abend', 'duschspa', '🫧', 'Dusch-Spa: Peeling und Haarkur', 'o', { text: 'Langsam, warm, und danach riechst du nach Urlaub.' }),
  r('abend', 'comics', '📰', 'Zeitschrift oder Comic auf dem Sofa', 'p', { text: 'Blättern ohne Anspruch.' }),
  r('abend', 'handarbeit', '🧶', 'Häkeln, stricken oder nähen', 'o', { text: 'Etwas für die Hände, während der Kopf Pause macht.' }),
  r('abend', 'balkonabend', '✨', 'Balkon-Abend mit Lichterkette', 'o', { tags: ['night'], text: 'Lichterkette an, Decke, ein Getränk – drinnen ist heute geschlossen.' }),
  r('abend', 'sofapicknick', '🧺', 'Sofa-Picknick', 'po', { text: 'Wie ein Picknick, nur ohne Ameisen.',
    steps: ['Decke auf den Boden oder aufs Sofa', 'Kleine Snacks auf Teller verteilen', 'Getränk mit Strohhalm', 'Film, Musik oder Gespräche'] }),
  r('abend', 'fotobuch', '🐾', 'Im Fotobuch blättern', 'p', { text: 'Bei Schätze. Seite für Seite, ganz in Ruhe.' }),

  // ---------- ✨ was Besonderes ----------
  r('besonders', 'ausflug', '🚗', 'Ein Ausflug, nur zum Spaß', 'of', { text: 'Irgendwohin, wo du noch nie warst – oder wo es immer schön ist.' }),
  r('besonders', 'massage', '💆', 'Eine Massage buchen', 'pof', { text: 'Jemand anders kümmert sich um deine Schultern.' }),
  r('besonders', 'cafe', '🥐', 'Frühstück im Café', 'pof', { text: 'Ausschlafen, dann Croissant und Cappuccino, die jemand anders macht.' }),
  r('besonders', 'buchkaufen', '📕', 'Ein neues Buch kaufen', 'of', { text: 'In einer echten Buchhandlung, mit Stöbern.' }),
  r('besonders', 'strauss', '💐', 'Einen Blumenstrauß nur für dich', 'pof', { text: 'Den, der dir gefällt. Nicht den praktischen.' }),
  r('besonders', 'kino', '🍿', 'Kino', 'of', { text: 'Großes Popcorn. Natürlich.' }),
  r('besonders', 'therme', '♨️', 'Ein Tag in der Therme', 'pof', { text: 'Wasser, Wärme, Liege, Buch. Den ganzen Tag.' }),
  r('besonders', 'tagesausflug', '🗺️', 'Ein Tagesausflug, wo es schön ist', 'f', { text: 'See, Berge, eine hübsche Altstadt – du suchst aus.' }),
  r('besonders', 'konzert', '🎟️', 'Karten für ein Konzert', 'of', { text: 'Etwas, auf das du dich wochenlang freuen kannst.' }),
  r('besonders', 'ewigwill', '🛍️', 'Das Teil, das du schon ewig willst', 'pof', { text: 'Du weißt genau, welches.' }),
  r('besonders', 'friseur', '💇', 'Friseur oder Pflegetermin nur für dich', 'pof', { text: 'Zeit, in der sich jemand nur um dich kümmert.' }),
  r('besonders', 'freiertag', '🌞', 'Ein ganzer freier Tag ohne Plan', 'pof', { text: 'Keine Liste. Nichts müssen. Schauen, worauf du Lust hast.' }),
  r('besonders', 'picknick', '🧺', 'Picknick im Park', 'of', { tags: ['out'], text: 'Decke, Leckereien, ein Buch – und vielleicht {p}.' }),
  r('besonders', 'wellnesshotel', '🏨', 'Eine Nacht im Wellnesshotel', 'pof', { text: 'Bademantel, Frühstücksbuffet, nichts aufräumen.' }),
  r('besonders', 'kochkurs', '👩‍🍳', 'Ein Kochkurs', 'f', { text: 'Etwas Neues lernen, und am Ende wird gegessen.' }),
  r('besonders', 'flohmarkt', '🏺', 'Über den Flohmarkt bummeln', 'of', { tags: ['out'], text: 'Ohne Plan, mit einem Kaffee in der Hand.' }),
  r('besonders', 'baden', '🏊', 'Baden gehen am See', 'f', { tags: ['out'], text: 'Kaltes Wasser, warme Sonne, ein Eis danach.' }),
  r('besonders', 'brunch', '🥞', 'Ausgiebiger Brunch zu Hause', 'of', { text: 'Pfannkuchen, Rührei, frischer Saft – und keine Uhr.' }),
  r('besonders', 'garten', '🌺', 'Botanischer Garten oder Zoo', 'of', { tags: ['out'], text: 'Langsam gehen, gucken, staunen.' }),
  r('besonders', 'museum', '🖼️', 'Ein Museum, das dich interessiert', 'of', { text: 'Ein Raum reicht, wenn er schön ist.' }),
  r('besonders', 'sauna', '🧖', 'Ein Sauna-Abend', 'pof', { text: 'Schwitzen, abkühlen, ausruhen. Danach schläfst du wie ein Stein.' }),
  r('besonders', 'freundinnen', '👯', 'Ein Abend mit Freundinnen', 'of', { text: 'Essen gehen, reden, lachen – bis es spät ist.' }),
];

// how much each ritual should come up right now (0 = not at all)
export function weight(x, ctx) {
  let w = x.own ? 2.5 : 1;
  const rate = ctx.rate[x.id];
  if (rate === 3) w *= 3; else if (rate === 2) w *= 1.2; else if (rate === 1) w *= 0.15;
  const ago = ctx.recent[x.id];
  if (ago != null) w *= ago <= 1 ? 0.1 : ago <= 3 ? 0.35 : ago <= 7 ? 0.7 : 1;
  if (x.prep && ctx.ready.has(x.prep)) w *= 1.8;
  const tags = x.tags || [];
  if (ctx.hour >= 20 || ctx.hour < 5) { if (tags.includes('out') && !tags.includes('night')) w *= 0.3; if (tags.includes('night')) w *= 1.4; }
  if ((ctx.hour >= 21 || ctx.hour < 5) && tags.includes('bed')) w *= 1.8;
  if (tags.includes('duo') && !ctx.partner) w *= 0.4;
  return w;
}

// one pick: matching size + energy (energy is relaxed when nothing fits), weighted, never one she just skipped
export function choose(pool, size, en, ctx, skip = []) {
  const bySize = pool.filter(x => x.size === size);
  let cand = bySize.filter(x => !en || x.en.includes(en));
  if (!cand.length) cand = bySize;
  let open = cand.filter(x => !skip.includes(x.id));
  if (!open.length) open = cand;                    // seen them all: start over
  const ws = open.map(x => weight(x, ctx)), sum = ws.reduce((a, b) => a + b, 0);
  if (sum <= 0) return open[Math.floor(Math.random() * open.length)];
  let t = Math.random() * sum;
  for (let i = 0; i < open.length; i++) { t -= ws[i]; if (t <= 0) return open[i]; }
  return open[open.length - 1];
}

export const OWN_ICONS = ['🛋️', '🫖', '🛁', '📚', '🎧', '🎬', '🕯️', '🌿', '🧘', '🎨', '🐶', '🍫', '🧺', '💆', '🌙', '✨', '🎮', '🧶', '🚶', '💛'];
