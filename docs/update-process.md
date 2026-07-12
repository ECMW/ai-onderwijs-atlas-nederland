# Actualiseringsproces

De keten is: **detecteren → vergelijken → voorstellen → valideren → publiceren**.

De dagelijkse workflow controleert alleen bronnen uit `sources.json`, schrijft bereikbaarheid en fingerprints en maakt reviewvoorstellen. Publieke records wijzigen nooit automatisch. Een redacteur vergelijkt het voorstel met de officiële bron, past het record aan, vult `lastVerified` in en opent een pull request. Na merge valideert en publiceert GitHub Pages automatisch.
