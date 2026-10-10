# Champs de formulaire — 10 octobre 2026

L'utilisateur a retenu une harmonisation sobre des champs dans toute l'application, sans refonte des dispositions. `app/globals.css` définit une seule présentation pour les champs de saisie, les sélecteurs et les zones de texte.

- Palette du thème : bleu nuit et or en sombre ; ivoire, bleu et or en clair.
- Fond légèrement teinté, bordure discrète, angles de 14 px et hauteur minimale de 46 px.
- Texte de 16 px, libellés existants conservés, espaces horizontaux propres à chaque composant pour ne pas recouvrir les icônes.
- Focus visible au clic et au clavier, avec contour doré et halo léger.
- Erreur via `aria-invalid="true"` ou `:user-invalid`, déclenché par la validation native après interaction, avec contour adapté au focus.
- Champ désactivé identifiable ; cases et boutons radio teintés avec l'accent du thème.
- Fichiers, couleurs, curseurs et boutons ne reçoivent pas la forme des champs texte. Aucune animation obligatoire ; la préférence de réduction des animations reste respectée.

La logique de saisie, les validations et les envois ne sont pas modifiés. Ce changement ne crée pas les libellés qui manqueraient à un formulaire : chaque nouveau champ doit toujours avoir un libellé associé et ses erreurs doivent être expliquées en texte.

La suggestion Uiverse la plus proche de cette direction est le [champ arrondi minimal d'alexruix](https://uiverse.io/alexruix/slippery-frog-10). Le [champ souligné de Satwinder04](https://uiverse.io/Satwinder04/ancient-sloth-30) est une autre référence sobre. Ces références ont été consultées comme inspiration ; l'implémentation est une écriture CSS propre à Ephemer, sans code tiers copié ni dépendance ajoutée.

La recette `tests/home-dates-preview.mjs` assemble les vrais composants avec des données fictives, sans Supabase ni fournisseur distant. Le contrôle navigateur couvre les champs texte/email/mot de passe/date, le sélecteur, la zone de texte, l'erreur, la désactivation, les cases et les thèmes sur mobile et ordinateur.
