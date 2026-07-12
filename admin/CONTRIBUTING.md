# Snelle beheerroute

1. Kopieer `record-template.json` en vul alleen aantoonbare gegevens in.
2. Voeg minimaal titel, recordtype, aanbieder en officiële bron toe.
3. Gebruik `needs_review` totdat een redacteur bron en datum heeft gecontroleerd.
4. Open een pull request. De validatieworkflow controleert schema, IDs, relaties en URLs.
5. Na review en merge genereert de deployworkflow de databestanden, test en publiceert GitHub Pages.

Automatische bronvoorstellen staan in workflow-artifacts en mogen nooit zonder inhoudelijke controle worden overgenomen.
