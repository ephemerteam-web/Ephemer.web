// Base de données locale des fêtes des Saints
// Format des dates : "MM-JJ" (mois-jour, sans l'année car la fête tombe chaque année)
// Un prénom principal peut avoir plusieurs VARIANTES qui partagent la même fête

export type Sainte = {
  date: string          // ex: "03-19" pour le 19 mars
  nomSaint: string      // ex: "Saint Joseph" (ce qu'on affichera)
  prenoms: string[]     // liste des prénoms (en minuscules, sans accents)
}

export const SAINTS: Sainte[] = [
  // JANVIER
  { date: "01-01", nomSaint: "Sainte Marie", prenoms: ["marie", "maria", "mary", "marion", "marianne"] },
  { date: "01-02", nomSaint: "Saint Basile", prenoms: ["basile", "basil"] },
  { date: "01-03", nomSaint: "Sainte Geneviève", prenoms: ["genevieve", "ginette"] },
  { date: "01-04", nomSaint: "Sainte Odile", prenoms: ["odile", "odette"] },
  { date: "01-05", nomSaint: "Saint Édouard", prenoms: ["edouard", "edward", "eddie"] },
  { date: "01-06", nomSaint: "Épiphanie", prenoms: ["balthazar", "melchior", "gaspar"] },
  { date: "01-07", nomSaint: "Saint Raymond", prenoms: ["raymond", "raymonde"] },
  { date: "01-08", nomSaint: "Saint Lucien", prenoms: ["lucien"] },
  { date: "01-09", nomSaint: "Sainte Alix", prenoms: ["alix", "alice", "alicia"] },
  { date: "01-10", nomSaint: "Saint Guillaume", prenoms: ["guillaume", "william", "liam"] },
  { date: "01-11", nomSaint: "Sainte Pauline", prenoms: ["pauline", "paula", "paulette"] },
  { date: "01-12", nomSaint: "Sainte Tatiana", prenoms: ["tatiana", "tania"] },
  { date: "01-13", nomSaint: "Saint Hilaire", prenoms: ["hilaire"] },
  { date: "01-14", nomSaint: "Sainte Nina", prenoms: ["nina"] },
  { date: "01-15", nomSaint: "Saint Rémi", prenoms: ["remi", "remy"] },
  { date: "01-16", nomSaint: "Saint Marcel", prenoms: ["marcel", "marcelle"] },
  { date: "01-17", nomSaint: "Saint Antoine", prenoms: ["antoine", "anthony", "antonin"] },
  { date: "01-18", nomSaint: "Sainte Prisca", prenoms: ["prisca", "priscille"] },
  { date: "01-19", nomSaint: "Saint Marius", prenoms: ["marius", "mario"] },
  { date: "01-20", nomSaint: "Saint Sébastien", prenoms: ["sebastien", "bastien"] },
  { date: "01-21", nomSaint: "Sainte Agnès", prenoms: ["agnes", "ines"] },
  { date: "01-22", nomSaint: "Saint Vincent", prenoms: ["vincent"] },
  { date: "01-23", nomSaint: "Saint Barnard", prenoms: ["barnard", "bernard"] },
  { date: "01-24", nomSaint: "Saint François de Sales", prenoms: ["francois", "francis"] },
  { date: "01-25", nomSaint: "Conversion de Saint Paul", prenoms: ["paul"] },
  { date: "01-26", nomSaint: "Sainte Paule", prenoms: ["paule"] },
  { date: "01-27", nomSaint: "Sainte Angèle", prenoms: ["angele", "angelique", "angelina"] },
  { date: "01-28", nomSaint: "Saint Thomas d'Aquin", prenoms: ["thomas", "tom"] },
  { date: "01-29", nomSaint: "Saint Gildas", prenoms: ["gildas"] },
  { date: "01-30", nomSaint: "Sainte Martine", prenoms: ["martine", "martina"] },
  { date: "01-31", nomSaint: "Sainte Marcelle", prenoms: ["marcelle", "marcella"] },

  // FÉVRIER
  { date: "02-01", nomSaint: "Sainte Ella", prenoms: ["ella", "eleonore"] },
  { date: "02-02", nomSaint: "Présentation du Seigneur", prenoms: ["theophane"] },
  { date: "02-03", nomSaint: "Saint Blaise", prenoms: ["blaise"] },
  { date: "02-04", nomSaint: "Sainte Véronique", prenoms: ["veronique", "veronica"] },
  { date: "02-05", nomSaint: "Sainte Agathe", prenoms: ["agathe"] },
  { date: "02-06", nomSaint: "Saint Gaston", prenoms: ["gaston"] },
  { date: "02-07", nomSaint: "Sainte Eugénie", prenoms: ["eugenie", "eugene"] },
  { date: "02-08", nomSaint: "Sainte Jacqueline", prenoms: ["jacqueline", "jackie"] },
  { date: "02-09", nomSaint: "Sainte Apolline", prenoms: ["apolline"] },
  { date: "02-10", nomSaint: "Saint Arnaud", prenoms: ["arnaud"] },
  { date: "02-11", nomSaint: "Notre-Dame de Lourdes", prenoms: ["lourdes"] },
  { date: "02-12", nomSaint: "Saint Félix", prenoms: ["felix", "felicie"] },
  { date: "02-13", nomSaint: "Sainte Béatrice", prenoms: ["beatrice"] },
  { date: "02-14", nomSaint: "Saint Valentin", prenoms: ["valentin", "valentine"] },
  { date: "02-15", nomSaint: "Saint Claude", prenoms: ["claude", "claudie"] },
  { date: "02-16", nomSaint: "Sainte Julienne", prenoms: ["julienne", "julien"] },
  { date: "02-17", nomSaint: "Saint Alexis", prenoms: ["alexis", "alexia"] },
  { date: "02-18", nomSaint: "Sainte Bernadette", prenoms: ["bernadette"] },
  { date: "02-19", nomSaint: "Saint Gabin", prenoms: ["gabin"] },
  { date: "02-20", nomSaint: "Sainte Aimée", prenoms: ["aimee", "aime"] },
  { date: "02-21", nomSaint: "Saint Pierre Damien", prenoms: ["pierre", "pierrick"] },
  { date: "02-22", nomSaint: "Sainte Isabelle", prenoms: ["isabelle", "isabel"] },
  { date: "02-23", nomSaint: "Saint Lazare", prenoms: ["lazare"] },
  { date: "02-24", nomSaint: "Saint Modeste", prenoms: ["modeste"] },
  { date: "02-25", nomSaint: "Saint Roméo", prenoms: ["romeo"] },
  { date: "02-26", nomSaint: "Saint Nestor", prenoms: ["nestor"] },
  { date: "02-27", nomSaint: "Sainte Honorine", prenoms: ["honorine"] },
  { date: "02-28", nomSaint: "Saint Romain", prenoms: ["romain", "roman"] },
  { date: "02-29", nomSaint: "Saint Auguste", prenoms: ["auguste", "augustin"] },

  // MARS
  { date: "03-01", nomSaint: "Saint Aubin", prenoms: ["aubin", "albin"] },
  { date: "03-02", nomSaint: "Saint Charles le Bon", prenoms: ["charles", "charlie"] },
  { date: "03-03", nomSaint: "Saint Guénolé", prenoms: ["guenole"] },
  { date: "03-04", nomSaint: "Saint Casimir", prenoms: ["casimir"] },
  { date: "03-05", nomSaint: "Sainte Olive", prenoms: ["olive"] },
  { date: "03-06", nomSaint: "Sainte Colette", prenoms: ["colette"] },
  { date: "03-07", nomSaint: "Sainte Félicité", prenoms: ["felicite", "felicity"] },
  { date: "03-08", nomSaint: "Saint Jean de Dieu", prenoms: ["jean"] },
  { date: "03-09", nomSaint: "Sainte Françoise", prenoms: ["francoise", "france"] },
  { date: "03-10", nomSaint: "Saint Vivien", prenoms: ["vivien", "viviane"] },
  { date: "03-11", nomSaint: "Sainte Rosine", prenoms: ["rosine"] },
  { date: "03-12", nomSaint: "Sainte Justine", prenoms: ["justine", "justin"] },
  { date: "03-13", nomSaint: "Saint Rodrigue", prenoms: ["rodrigue", "rodrigo"] },
  { date: "03-14", nomSaint: "Sainte Mathilde", prenoms: ["mathilde", "maud"] },
  { date: "03-15", nomSaint: "Sainte Louise", prenoms: ["louise", "louis"] },
  { date: "03-16", nomSaint: "Sainte Bénédicte", prenoms: ["benedicte", "benoit"] },
  { date: "03-17", nomSaint: "Saint Patrick", prenoms: ["patrick", "patricia"] },
  { date: "03-18", nomSaint: "Saint Cyrille", prenoms: ["cyril", "cyrille"] },
  { date: "03-19", nomSaint: "Saint Joseph", prenoms: ["joseph", "josephine"] },
  { date: "03-20", nomSaint: "Saint Herbert", prenoms: ["herbert"] },
  { date: "03-21", nomSaint: "Sainte Clémence", prenoms: ["clemence", "clementine"] },
  { date: "03-22", nomSaint: "Sainte Léa", prenoms: ["lea"] },
  { date: "03-23", nomSaint: "Saint Victorien", prenoms: ["victorien"] },
  { date: "03-24", nomSaint: "Sainte Catherine de Suède", prenoms: ["catherine", "cathy"] },
  { date: "03-25", nomSaint: "Annonciation", prenoms: ["gabriel", "gabrielle"] },
  { date: "03-26", nomSaint: "Sainte Larissa", prenoms: ["larissa"] },
  { date: "03-27", nomSaint: "Saint Habib", prenoms: ["habib"] },
  { date: "03-28", nomSaint: "Saint Gontran", prenoms: ["gontran"] },
  { date: "03-29", nomSaint: "Sainte Gladys", prenoms: ["gladys"] },
  { date: "03-30", nomSaint: "Saint Amédée", prenoms: ["amedee"] },
  { date: "03-31", nomSaint: "Saint Benjamin", prenoms: ["benjamin", "ben"] },

  // AVRIL
  { date: "04-01", nomSaint: "Saint Hugues", prenoms: ["hugues", "hugo"] },
  { date: "04-02", nomSaint: "Sainte Sandrine", prenoms: ["sandrine"] },
  { date: "04-03", nomSaint: "Saint Richard", prenoms: ["richard"] },
  { date: "04-04", nomSaint: "Saint Isidore", prenoms: ["isidore"] },
  { date: "04-05", nomSaint: "Sainte Irène", prenoms: ["irene"] },
  { date: "04-06", nomSaint: "Saint Marcellin", prenoms: ["marcellin"] },
  { date: "04-07", nomSaint: "Saint Jean-Baptiste de la Salle", prenoms: ["jean"] },
  { date: "04-08", nomSaint: "Sainte Julie", prenoms: ["julie", "julia"] },
  { date: "04-09", nomSaint: "Saint Gautier", prenoms: ["gautier"] },
  { date: "04-10", nomSaint: "Saint Fulbert", prenoms: ["fulbert"] },
  { date: "04-11", nomSaint: "Saint Stanislas", prenoms: ["stanislas", "stan"] },
  { date: "04-12", nomSaint: "Saint Jules", prenoms: ["jules"] },
  { date: "04-13", nomSaint: "Saint Martin Ier", prenoms: ["martin"] },
  { date: "04-14", nomSaint: "Saint Maxime", prenoms: ["maxime", "max"] },
  { date: "04-15", nomSaint: "Saint Paterne", prenoms: ["paterne"] },
  { date: "04-16", nomSaint: "Saint Benoît-Joseph Labre", prenoms: ["benoit"] },
  { date: "04-17", nomSaint: "Saint Anicet", prenoms: ["anicet"] },
  { date: "04-18", nomSaint: "Saint Parfait", prenoms: ["parfait"] },
  { date: "04-19", nomSaint: "Sainte Emma", prenoms: ["emma"] },
  { date: "04-20", nomSaint: "Sainte Odette", prenoms: ["odette"] },
  { date: "04-21", nomSaint: "Saint Anselme", prenoms: ["anselme"] },
  { date: "04-22", nomSaint: "Saint Alexandre", prenoms: ["alexandre", "alex"] },
  { date: "04-23", nomSaint: "Saint Georges", prenoms: ["georges"] },
  { date: "04-24", nomSaint: "Saint Fidèle", prenoms: ["fidele"] },
  { date: "04-25", nomSaint: "Saint Marc", prenoms: ["marc", "marco"] },
  { date: "04-26", nomSaint: "Sainte Alida", prenoms: ["alida"] },
  { date: "04-27", nomSaint: "Sainte Zita", prenoms: ["zita"] },
  { date: "04-28", nomSaint: "Sainte Valérie", prenoms: ["valerie"] },
  { date: "04-29", nomSaint: "Sainte Catherine de Sienne", prenoms: ["catherine"] },
  { date: "04-30", nomSaint: "Saint Robert", prenoms: ["robert"] },

  // MAI
  { date: "05-01", nomSaint: "Saint Joseph artisan", prenoms: ["joseph"] },
  { date: "05-02", nomSaint: "Saint Boris", prenoms: ["boris"] },
  { date: "05-03", nomSaint: "Saint Philippe", prenoms: ["philippe", "philip"] },
  { date: "05-04", nomSaint: "Saint Sylvain", prenoms: ["sylvain", "sylvie"] },
  { date: "05-05", nomSaint: "Sainte Judith", prenoms: ["judith"] },
  { date: "05-06", nomSaint: "Sainte Prudence", prenoms: ["prudence"] },
  { date: "05-07", nomSaint: "Sainte Gisèle", prenoms: ["gisele"] },
  { date: "05-08", nomSaint: "Saint Désiré", prenoms: ["desire"] },
  { date: "05-09", nomSaint: "Saint Pacôme", prenoms: ["pacome"] },
  { date: "05-10", nomSaint: "Sainte Solange", prenoms: ["solange"] },
  { date: "05-11", nomSaint: "Sainte Estelle", prenoms: ["estelle", "stella"] },
  { date: "05-12", nomSaint: "Saint Achille", prenoms: ["achille"] },
  { date: "05-13", nomSaint: "Sainte Rolande", prenoms: ["rolande"] },
  { date: "05-14", nomSaint: "Saint Matthias", prenoms: ["matthias"] },
  { date: "05-15", nomSaint: "Sainte Denise", prenoms: ["denise"] },
  { date: "05-16", nomSaint: "Saint Honoré", prenoms: ["honore"] },
  { date: "05-17", nomSaint: "Saint Pascal", prenoms: ["pascal", "pascale"] },
  { date: "05-18", nomSaint: "Saint Éric", prenoms: ["eric", "erika"] },
  { date: "05-19", nomSaint: "Saint Yves", prenoms: ["yves", "yvon"] },
  { date: "05-20", nomSaint: "Saint Bernardin", prenoms: ["bernardin"] },
  { date: "05-21", nomSaint: "Saint Constantin", prenoms: ["constantin"] },
  { date: "05-22", nomSaint: "Sainte Émilie", prenoms: ["emilie", "emily"] },
  { date: "05-23", nomSaint: "Saint Didier", prenoms: ["didier"] },
  { date: "05-24", nomSaint: "Saint Donatien", prenoms: ["donatien"] },
  { date: "05-25", nomSaint: "Sainte Sophie", prenoms: ["sophie", "sophia"] },
  { date: "05-26", nomSaint: "Saint Bérenger", prenoms: ["berenger"] },
  { date: "05-27", nomSaint: "Saint Augustin de Cantorbéry", prenoms: ["augustin"] },
  { date: "05-28", nomSaint: "Saint Germain", prenoms: ["germain"] },
  { date: "05-29", nomSaint: "Saint Aymar", prenoms: ["aymar"] },
  { date: "05-30", nomSaint: "Sainte Jeanne d'Arc", prenoms: ["jeanne"] },
  { date: "05-31", nomSaint: "Visitation", prenoms: ["marie"] },

  // JUIN
  { date: "06-01", nomSaint: "Saint Justin", prenoms: ["justin"] },
  { date: "06-02", nomSaint: "Saint Eugène", prenoms: ["eugene"] },
  { date: "06-03", nomSaint: "Saint Kévin", prenoms: ["kevin"] },
  { date: "06-04", nomSaint: "Sainte Clotilde", prenoms: ["clotilde"] },
  { date: "06-05", nomSaint: "Saint Igor", prenoms: ["igor"] },
  { date: "06-06", nomSaint: "Saint Norbert", prenoms: ["norbert"] },
  { date: "06-07", nomSaint: "Saint Gilbert", prenoms: ["gilbert"] },
  { date: "06-08", nomSaint: "Saint Médard", prenoms: ["medard"] },
  { date: "06-09", nomSaint: "Sainte Diane", prenoms: ["diane", "diana"] },
  { date: "06-10", nomSaint: "Saint Landry", prenoms: ["landry"] },
  { date: "06-11", nomSaint: "Saint Barnabé", prenoms: ["barnabe"] },
  { date: "06-12", nomSaint: "Saint Guy", prenoms: ["guy"] },
  { date: "06-13", nomSaint: "Saint Antoine de Padoue", prenoms: ["antoine"] },
  { date: "06-14", nomSaint: "Saint Élisée", prenoms: ["elisee"] },
  { date: "06-15", nomSaint: "Sainte Germaine", prenoms: ["germaine"] },
  { date: "06-16", nomSaint: "Saint Jean-François Régis", prenoms: ["jean-francois"] },
  { date: "06-17", nomSaint: "Saint Hervé", prenoms: ["herve"] },
  { date: "06-18", nomSaint: "Saint Léonce", prenoms: ["leonce"] },
  { date: "06-19", nomSaint: "Saint Romuald", prenoms: ["romuald"] },
  { date: "06-20", nomSaint: "Saint Silvère", prenoms: ["silvere"] },
  { date: "06-21", nomSaint: "Saint Rodolphe", prenoms: ["rodolphe"] },
  { date: "06-22", nomSaint: "Saint Alban", prenoms: ["alban"] },
  { date: "06-23", nomSaint: "Sainte Audrey", prenoms: ["audrey"] },
  { date: "06-24", nomSaint: "Saint Jean-Baptiste", prenoms: ["jean", "jean-baptiste"] },
  { date: "06-25", nomSaint: "Saint Prosper", prenoms: ["prosper"] },
  { date: "06-26", nomSaint: "Saint Anthelme", prenoms: ["anthelme"] },
  { date: "06-27", nomSaint: "Saint Fernand", prenoms: ["fernand"] },
  { date: "06-28", nomSaint: "Saint Irénée", prenoms: ["irenee"] },
  { date: "06-29", nomSaint: "Saint Pierre", prenoms: ["pierre"] },
  { date: "06-30", nomSaint: "Saint Martial", prenoms: ["martial"] },

  // JUILLET
  { date: "07-01", nomSaint: "Saint Thierry", prenoms: ["thierry"] },
  { date: "07-02", nomSaint: "Saint Martinien", prenoms: ["martinien"] },
  { date: "07-03", nomSaint: "Saint Thomas", prenoms: ["thomas"] },
  { date: "07-04", nomSaint: "Saint Florent", prenoms: ["florent"] },
  { date: "07-05", nomSaint: "Saint Antoine-Marie Zaccaria", prenoms: ["antoine"] },
  { date: "07-06", nomSaint: "Sainte Mariette", prenoms: ["mariette"] },
  { date: "07-07", nomSaint: "Saint Raoul", prenoms: ["raoul"] },
  { date: "07-08", nomSaint: "Saint Thibault", prenoms: ["thibault"] },
  { date: "07-09", nomSaint: "Sainte Amandine", prenoms: ["amandine", "amanda"] },
  { date: "07-10", nomSaint: "Saint Ulric", prenoms: ["ulric"] },
  { date: "07-11", nomSaint: "Saint Benoît", prenoms: ["benoit"] },
  { date: "07-12", nomSaint: "Saint Olivier", prenoms: ["olivier", "oliver"] },
  { date: "07-13", nomSaint: "Saint Henri", prenoms: ["henri", "henry"] },
  { date: "07-14", nomSaint: "Fête Nationale", prenoms: ["france"] },
  { date: "07-15", nomSaint: "Saint Donald", prenoms: ["donald"] },
  { date: "07-16", nomSaint: "Notre-Dame du Mont-Carmel", prenoms: ["carmel"] },
  { date: "07-17", nomSaint: "Sainte Charlotte", prenoms: ["charlotte"] },
  { date: "07-18", nomSaint: "Saint Frédéric", prenoms: ["frederic"] },
  { date: "07-19", nomSaint: "Saint Arsène", prenoms: ["arsene"] },
  { date: "07-20", nomSaint: "Sainte Marina", prenoms: ["marina"] },
  { date: "07-21", nomSaint: "Saint Victor", prenoms: ["victor"] },
  { date: "07-22", nomSaint: "Sainte Marie-Madeleine", prenoms: ["madeleine"] },
  { date: "07-23", nomSaint: "Sainte Brigitte", prenoms: ["brigitte"] },
  { date: "07-24", nomSaint: "Sainte Christine", prenoms: ["christine"] },
  { date: "07-25", nomSaint: "Saint Jacques", prenoms: ["jacques", "james"] },
  { date: "07-26", nomSaint: "Sainte Anne", prenoms: ["anne", "anna"] },
  { date: "07-27", nomSaint: "Sainte Nathalie", prenoms: ["nathalie"] },
  { date: "07-28", nomSaint: "Saint Samson", prenoms: ["samson"] },
  { date: "07-29", nomSaint: "Sainte Marthe", prenoms: ["marthe"] },
  { date: "07-30", nomSaint: "Sainte Juliette", prenoms: ["juliette"] },
  { date: "07-31", nomSaint: "Saint Ignace de Loyola", prenoms: ["ignace"] },

  // AOÛT
  { date: "08-01", nomSaint: "Saint Alphonse", prenoms: ["alphonse"] },
  { date: "08-02", nomSaint: "Saint Julien", prenoms: ["julien"] },
  { date: "08-03", nomSaint: "Sainte Lydie", prenoms: ["lydie"] },
  { date: "08-04", nomSaint: "Saint Jean-Marie Vianney", prenoms: ["jean-marie"] },
  { date: "08-05", nomSaint: "Saint Abel", prenoms: ["abel"] },
  { date: "08-06", nomSaint: "Transfiguration", prenoms: ["salvador"] },
  { date: "08-07", nomSaint: "Saint Gaétan", prenoms: ["gaetan"] },
  { date: "08-08", nomSaint: "Saint Dominique", prenoms: ["dominique"] },
  { date: "08-09", nomSaint: "Saint Amour", prenoms: ["amour"] },
  { date: "08-10", nomSaint: "Saint Laurent", prenoms: ["laurent"] },
  { date: "08-11", nomSaint: "Sainte Claire", prenoms: ["claire", "clara"] },
  { date: "08-12", nomSaint: "Sainte Chantal", prenoms: ["chantal"] },
  { date: "08-13", nomSaint: "Saint Hippolyte", prenoms: ["hippolyte"] },
  { date: "08-14", nomSaint: "Saint Evrard", prenoms: ["evrard"] },
  { date: "08-15", nomSaint: "Assomption", prenoms: ["marie"] },
  { date: "08-16", nomSaint: "Saint Armel", prenoms: ["armel"] },
  { date: "08-17", nomSaint: "Saint Hyacinthe", prenoms: ["hyacinthe"] },
  { date: "08-18", nomSaint: "Sainte Hélène", prenoms: ["helene", "elena"] },
  { date: "08-19", nomSaint: "Saint Jean-Eudes", prenoms: ["jean"] },
  { date: "08-20", nomSaint: "Saint Bernard", prenoms: ["bernard"] },
  { date: "08-21", nomSaint: "Saint Christophe", prenoms: ["christophe"] },
  { date: "08-22", nomSaint: "Saint Fabrice", prenoms: ["fabrice"] },
  { date: "08-23", nomSaint: "Sainte Rose de Lima", prenoms: ["rose"] },
  { date: "08-24", nomSaint: "Saint Barthélemy", prenoms: ["barthelemy"] },
  { date: "08-25", nomSaint: "Saint Louis", prenoms: ["louis", "ludovic"] },
  { date: "08-26", nomSaint: "Sainte Natacha", prenoms: ["natacha"] },
  { date: "08-27", nomSaint: "Sainte Monique", prenoms: ["monique"] },
  { date: "08-28", nomSaint: "Saint Augustin", prenoms: ["augustin"] },
  { date: "08-29", nomSaint: "Sainte Sabine", prenoms: ["sabine"] },
  { date: "08-30", nomSaint: "Saint Fiacre", prenoms: ["fiacre"] },
  { date: "08-31", nomSaint: "Saint Aristide", prenoms: ["aristide"] },

  // SEPTEMBRE
  { date: "09-01", nomSaint: "Saint Gilles", prenoms: ["gilles"] },
  { date: "09-02", nomSaint: "Sainte Ingrid", prenoms: ["ingrid"] },
  { date: "09-03", nomSaint: "Saint Grégoire", prenoms: ["gregoire", "gregory"] },
  { date: "09-04", nomSaint: "Sainte Rosalie", prenoms: ["rosalie"] },
  { date: "09-05", nomSaint: "Sainte Raïssa", prenoms: ["raissa"] },
  { date: "09-06", nomSaint: "Saint Bertrand", prenoms: ["bertrand"] },
  { date: "09-07", nomSaint: "Sainte Reine", prenoms: ["reine"] },
  { date: "09-08", nomSaint: "Nativité de Marie", prenoms: ["marie"] },
  { date: "09-09", nomSaint: "Saint Alain", prenoms: ["alain"] },
  { date: "09-10", nomSaint: "Sainte Inès", prenoms: ["ines"] },
  { date: "09-11", nomSaint: "Saint Adelphe", prenoms: ["adelphe"] },
  { date: "09-12", nomSaint: "Saint Apollinaire", prenoms: ["apollinaire"] },
  { date: "09-13", nomSaint: "Saint Aimé", prenoms: ["aime"] },
  { date: "09-14", nomSaint: "Croix Glorieuse", prenoms: ["croix"] },
  { date: "09-15", nomSaint: "Saint Roland", prenoms: ["roland"] },
  { date: "09-16", nomSaint: "Sainte Édith", prenoms: ["edith"] },
  { date: "09-17", nomSaint: "Saint Renaud", prenoms: ["renaud"] },
  { date: "09-18", nomSaint: "Sainte Nadège", prenoms: ["nadege"] },
  { date: "09-19", nomSaint: "Sainte Émilie de Rodat", prenoms: ["emilie"] },
  { date: "09-20", nomSaint: "Saint Davy", prenoms: ["davy"] },
  { date: "09-21", nomSaint: "Saint Matthieu", prenoms: ["matthieu", "matthew"] },
  { date: "09-22", nomSaint: "Saint Maurice", prenoms: ["maurice"] },
  { date: "09-23", nomSaint: "Saint Constant", prenoms: ["constant"] },
  { date: "09-24", nomSaint: "Saint Thècle", prenoms: ["thecle"] },
  { date: "09-25", nomSaint: "Saint Hermann", prenoms: ["hermann"] },
  { date: "09-26", nomSaint: "Saint Côme", prenoms: ["come"] },
  { date: "09-27", nomSaint: "Saint Vincent de Paul", prenoms: ["vincent"] },
  { date: "09-28", nomSaint: "Saint Venceslas", prenoms: ["venceslas"] },
  { date: "09-29", nomSaint: "Saint Michel", prenoms: ["michel", "michael"] },
  { date: "09-30", nomSaint: "Saint Jérôme", prenoms: ["jerome"] },

  // OCTOBRE
  { date: "10-01", nomSaint: "Sainte Thérèse de Lisieux", prenoms: ["therese"] },
  { date: "10-02", nomSaint: "Saint Léger", prenoms: ["leger"] },
  { date: "10-03", nomSaint: "Saint Gérard", prenoms: ["gerard"] },
  { date: "10-04", nomSaint: "Saint François d'Assise", prenoms: ["francois"] },
  { date: "10-05", nomSaint: "Sainte Fleur", prenoms: ["fleur"] },
  { date: "10-06", nomSaint: "Saint Bruno", prenoms: ["bruno"] },
  { date: "10-07", nomSaint: "Notre-Dame du Rosaire", prenoms: ["marie"] },
  { date: "10-08", nomSaint: "Sainte Pélagie", prenoms: ["pelagie"] },
  { date: "10-09", nomSaint: "Saint Denis", prenoms: ["denis"] },
  { date: "10-10", nomSaint: "Saint Ghislain", prenoms: ["ghislain"] },
  { date: "10-11", nomSaint: "Saint Firmin", prenoms: ["firmin"] },
  { date: "10-12", nomSaint: "Saint Wilfried", prenoms: ["wilfried"] },
  { date: "10-13", nomSaint: "Saint Géraud", prenoms: ["geraud"] },
  { date: "10-14", nomSaint: "Saint Juste", prenoms: ["juste"] },
  { date: "10-15", nomSaint: "Sainte Thérèse d'Avila", prenoms: ["therese"] },
  { date: "10-16", nomSaint: "Sainte Edwige", prenoms: ["edwige"] },
  { date: "10-17", nomSaint: "Saint Baudouin", prenoms: ["baudouin"] },
  { date: "10-18", nomSaint: "Saint Luc", prenoms: ["luc", "lucas"] },
  { date: "10-19", nomSaint: "Saint René", prenoms: ["rene"] },
  { date: "10-20", nomSaint: "Sainte Adeline", prenoms: ["adeline"] },
  { date: "10-21", nomSaint: "Sainte Céline", prenoms: ["celine"] },
  { date: "10-22", nomSaint: "Sainte Élodie", prenoms: ["elodie"] },
  { date: "10-23", nomSaint: "Saint Jean de Capistran", prenoms: ["jean"] },
  { date: "10-24", nomSaint: "Saint Florentin", prenoms: ["florentin"] },
  { date: "10-25", nomSaint: "Sainte Doria", prenoms: ["doria"] },
  { date: "10-26", nomSaint: "Saint Dimitri", prenoms: ["dimitri"] },
  { date: "10-27", nomSaint: "Sainte Émeline", prenoms: ["emeline"] },
  { date: "10-28", nomSaint: "Saint Simon", prenoms: ["simon", "simone"] },
  { date: "10-29", nomSaint: "Saint Narcisse", prenoms: ["narcisse"] },
  { date: "10-30", nomSaint: "Sainte Bienvenue", prenoms: ["bienvenue"] },
  { date: "10-31", nomSaint: "Saint Quentin", prenoms: ["quentin"] },

  // NOVEMBRE
  { date: "11-01", nomSaint: "Toussaint", prenoms: ["toussaint"] },
  { date: "11-02", nomSaint: "Commémoration des défunts", prenoms: ["defunts"] },
  { date: "11-03", nomSaint: "Saint Hubert", prenoms: ["hubert"] },
  { date: "11-04", nomSaint: "Saint Charles Borromée", prenoms: ["charles"] },
  { date: "11-05", nomSaint: "Sainte Sylvie", prenoms: ["sylvie"] },
  { date: "11-06", nomSaint: "Sainte Bertille", prenoms: ["bertille"] },
  { date: "11-07", nomSaint: "Sainte Carine", prenoms: ["carine"] },
  { date: "11-08", nomSaint: "Saint Geoffroy", prenoms: ["geoffroy"] },
  { date: "11-09", nomSaint: "Saint Théodore", prenoms: ["theodore", "theo"] },
  { date: "11-10", nomSaint: "Saint Léon", prenoms: ["leon", "leo", "leonard"] },
  { date: "11-11", nomSaint: "Saint Martin", prenoms: ["martin"] },
  { date: "11-12", nomSaint: "Saint Christian", prenoms: ["christian"] },
  { date: "11-13", nomSaint: "Saint Brice", prenoms: ["brice"] },
  { date: "11-14", nomSaint: "Saint Sidoine", prenoms: ["sidoine"] },
  { date: "11-15", nomSaint: "Saint Albert", prenoms: ["albert"] },
  { date: "11-16", nomSaint: "Sainte Marguerite", prenoms: ["marguerite", "margot"] },
  { date: "11-17", nomSaint: "Sainte Élisabeth", prenoms: ["elisabeth", "elizabeth"] },
  { date: "11-18", nomSaint: "Sainte Aude", prenoms: ["aude"] },
  { date: "11-19", nomSaint: "Saint Tanguy", prenoms: ["tanguy"] },
  { date: "11-20", nomSaint: "Saint Edmond", prenoms: ["edmond"] },
  { date: "11-21", nomSaint: "Présentation de Marie", prenoms: ["marie"] },
  { date: "11-22", nomSaint: "Sainte Cécile", prenoms: ["cecile", "cecilia"] },
  { date: "11-23", nomSaint: "Saint Clément", prenoms: ["clement"] },
  { date: "11-24", nomSaint: "Sainte Flora", prenoms: ["flora", "flore"] },
  { date: "11-25", nomSaint: "Sainte Catherine Labouré", prenoms: ["catherine"] },
  { date: "11-26", nomSaint: "Sainte Delphine", prenoms: ["delphine"] },
  { date: "11-27", nomSaint: "Saint Séverin", prenoms: ["severin"] },
  { date: "11-28", nomSaint: "Saint Jacques de la Marche", prenoms: ["jacques"] },
  { date: "11-29", nomSaint: "Saint Saturnin", prenoms: ["saturnin"] },
  { date: "11-30", nomSaint: "Saint André", prenoms: ["andre", "andrew"] },

  // DÉCEMBRE
  { date: "12-01", nomSaint: "Sainte Florence", prenoms: ["florence"] },
  { date: "12-02", nomSaint: "Sainte Viviane", prenoms: ["viviane"] },
  { date: "12-03", nomSaint: "Saint François-Xavier", prenoms: ["francois", "francis"] },
  { date: "12-04", nomSaint: "Sainte Barbara", prenoms: ["barbara"] },
  { date: "12-05", nomSaint: "Saint Gérald", prenoms: ["gerald"] },
  { date: "12-06", nomSaint: "Saint Nicolas", prenoms: ["nicolas", "nicole"] },
  { date: "12-07", nomSaint: "Saint Ambroise", prenoms: ["ambroise"] },
  { date: "12-08", nomSaint: "Immaculée Conception", prenoms: ["conception"] },
  { date: "12-09", nomSaint: "Saint Pierre Fourier", prenoms: ["pierre"] },
  { date: "12-10", nomSaint: "Sainte Olivia", prenoms: ["olivia"] },
  { date: "12-11", nomSaint: "Saint Daniel", prenoms: ["daniel"] },
  { date: "12-12", nomSaint: "Sainte Chantal", prenoms: ["chantal"] },
  { date: "12-13", nomSaint: "Sainte Lucie", prenoms: ["lucie", "lucy"] },
  { date: "12-14", nomSaint: "Saint Odile", prenoms: ["odile"] },
  { date: "12-15", nomSaint: "Sainte Ninon", prenoms: ["ninon"] },
  { date: "12-16", nomSaint: "Sainte Alice", prenoms: ["alice"] },
  { date: "12-17", nomSaint: "Saint Gaël", prenoms: ["gael", "gaelle"] },
  { date: "12-18", nomSaint: "Saint Gatien", prenoms: ["gatien"] },
  { date: "12-19", nomSaint: "Saint Urbain", prenoms: ["urbain"] },
  { date: "12-20", nomSaint: "Saint Théophile", prenoms: ["theophile"] },
  { date: "12-21", nomSaint: "Saint Pierre Canisius", prenoms: ["pierre"] },
  { date: "12-22", nomSaint: "Sainte Françoise-Xavière", prenoms: ["francoise"] },
  { date: "12-23", nomSaint: "Saint Armand", prenoms: ["armand", "armande"] },
  { date: "12-24", nomSaint: "Sainte Adèle", prenoms: ["adele", "adeline"] },
  { date: "12-25", nomSaint: "Noël", prenoms: ["noel", "noelle"] },
  { date: "12-26", nomSaint: "Saint Étienne", prenoms: ["etienne", "stephane"] },
  { date: "12-27", nomSaint: "Saint Jean", prenoms: ["jean"] },
  { date: "12-28", nomSaint: "Saints Innocents", prenoms: ["innocent"] },
  { date: "12-29", nomSaint: "Saint David", prenoms: ["david"] },
  { date: "12-30", nomSaint: "Saint Roger", prenoms: ["roger"] },
  { date: "12-31", nomSaint: "Saint Sylvestre", prenoms: ["sylvestre", "sylvain"] },
]

// ============================================================
// 🚀 OPTIMISATION : INDEX RAPIDES (Maps)
// ============================================================
// Une Map, c'est comme un dictionnaire : on cherche par "clé"
// et on obtient la réponse instantanément (O(1) au lieu de O(n))
// Ces index sont construits UNE SEULE FOIS au chargement du fichier.

/**
 * Index par DATE (format "MM-JJ")
 * Exemple : SAINTS_PAR_DATE.get("01-01") → { date: "01-01", nomSaint: "Sainte Marie", ... }
 */
export const SAINTS_PAR_DATE: Map<string, Sainte> = new Map(
  SAINTS.map(saint => [saint.date, saint])
)

/**
 * Index par PRÉNOM (en minuscules, sans accents)
 * Comme un prénom peut être une "variante" (ex: "marion" pour "Sainte Marie"),
 * on associe CHAQUE prénom de la liste à sa fête.
 * Exemple : SAINTS_PAR_PRENOM.get("marion") → { date: "01-01", nomSaint: "Sainte Marie", ... }
 */
export const SAINTS_PAR_PRENOM: Map<string, Sainte[]> = new Map()

SAINTS.forEach((saint) => {
  saint.prenoms.forEach((prenom) => {
    const key = normaliserPrenom(prenom)

    if (!SAINTS_PAR_PRENOM.has(key)) {
      SAINTS_PAR_PRENOM.set(key, [])
    }

    SAINTS_PAR_PRENOM.get(key)!.push(saint)
  })
})

// ============================================================
// 🔍 FONCTIONS DE RECHERCHE RAPIDES
// ============================================================

/**
 * Normalise un prénom : minuscules + suppression des accents + trim
 * Ex : "Geneviève" → "genevieve"
 */
function normaliserPrenom(prenom: string): string {
  return prenom
    .toLowerCase()
    .normalize('NFD')                // décompose les accents (é → e + ´)
    .replace(/[\u0300-\u036f]/g, '') // supprime les accents
    .trim()
}

/**
 * Trouve la fête d'un prénom donné.
 * Retourne `undefined` si le prénom n'existe pas dans la base.
 *
 * @example
 *   trouverSaintParPrenom("Marie")     → { date: "01-01", nomSaint: "Sainte Marie", ... }
 *   trouverSaintParPrenom("Geneviève") → { date: "01-03", nomSaint: "Sainte Geneviève", ... }
 *   trouverSaintParPrenom("Xyz")       → undefined
 */
export function trouverTousLesSaintsParPrenom(prenom: string): Sainte[] {
  return SAINTS_PAR_PRENOM.get(normaliserPrenom(prenom)) || []
}
/**
 * Trouve la fête d'un prénom donné (retourne la première occurrence).
 * Si tu préfères utiliser la fête la plus proche, utilise plutôt `trouverProchaineFete`.
 */
export function trouverSaintParPrenom(prenom: string): Sainte | undefined {
  const saints = trouverTousLesSaintsParPrenom(prenom)
  return saints.length > 0 ? saints[0] : undefined
}
export function trouverProchaineFete(prenom: string): Sainte | null {
  const saints = trouverTousLesSaintsParPrenom(prenom)

  if (saints.length === 0) return null

  const aujourdHui = new Date()

  const saintsAvecDate = saints.map((saint) => {
    const [mois, jour] = saint.date.split('-').map(Number)

    let date = new Date(aujourdHui.getFullYear(), mois - 1, jour)

    if (date < aujourdHui) {
      date = new Date(aujourdHui.getFullYear() + 1, mois - 1, jour)
    }

    return { ...saint, dateObj: date }
  })

  saintsAvecDate.sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())

  return saintsAvecDate[0]
}
/**
 * Trouve la fête d'un jour donné.
 * @param date - format "MM-JJ" (ex: "03-19")
 *
 * @example
 *   trouverSaintParDate("01-01") → { date: "01-01", nomSaint: "Sainte Marie", ... }
 */
export function trouverSaintParDate(date: string): Sainte | undefined {
  return SAINTS_PAR_DATE.get(date)
}

