<template>
  <div class="help-wrapper">
    <h2 class="mb-4">ℹ️ Hilfe & Informationen</h2>

    <Tabs value="0">
      <TabList>
        <Tab value="0">👨‍👩‍👧 Für Eltern</Tab>
        <Tab value="1">👩‍🏫 Für Lehrkräfte</Tab>
        <Tab value="2">🔒 Datenschutz</Tab>
      </TabList>

      <TabPanels>
        <!-- Tab Eltern -->
        <TabPanel value="0">
          <div class="flex flex-column gap-4 mt-3">
            <div class="p-card p-4">
              <h3 class="mt-0">🗓️ Wie buche ich einen Termin?</h3>
              <ol class="line-height-3">
                <li>Wählen Sie die gewünschte <strong>Lehrkraft</strong> aus der Liste.</li>
                <li>Wählen Sie einen freien <strong>Zeitslot</strong> (grün = verfügbar).</li>
                <li>
                  Geben Sie Ihren <strong>Namen</strong> und den
                  <strong>Namen Ihres Kindes</strong> ein.
                </li>
                <li>Klicken Sie auf <strong>„Termin buchen"</strong>.</li>
              </ol>
              <p class="mt-3">
                Ihre gebuchten Termine erscheinen direkt darunter unter
                <em>„Meine gebuchten Termine"</em>.
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">🔄 Kann ich mehrere Termine buchen?</h3>
              <p class="line-height-3">
                Ja! Klicken Sie nach einer Buchung auf <strong>„Termin buchen"</strong>, um zur
                Lehrerauswahl zurückzukehren und einen weiteren Termin zu buchen.
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">❌ Wie storniere ich einen Termin?</h3>
              <p class="line-height-3">
                Unter <em>„Meine gebuchten Termine"</em> finden Sie alle Ihre Buchungen. Mit dem
                <strong>🗑️ Papierkorb-Symbol</strong> können Sie einen Termin löschen.
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">⚠️ Wichtige Hinweise zur Bedienung</h3>
              <ul class="line-height-3">
                <li>
                  Bitte benutzen Sie <strong>nicht den Zurück-Button</strong> des Browsers — nutzen
                  Sie stattdessen die Schaltflächen auf der Seite.
                </li>
                <li>
                  Ihre Termine sind an diesen <strong>Browser und dieses Gerät</strong> gebunden.
                  Wenn Sie das Gerät wechseln, sind Ihre Buchungen dort nicht sichtbar.
                </li>
                <li>Belegte Zeitslots (grau) können nicht gebucht werden.</li>
              </ul>
            </div>
          </div>
        </TabPanel>

        <!-- Tab Lehrkräfte -->
        <TabPanel value="1">
          <div class="flex flex-column gap-4 mt-3">
            <div class="p-card p-4">
              <h3 class="mt-0">📋 Meine Termine einsehen</h3>
              <p class="line-height-3">
                Unter <strong>Termine → Meine Termine</strong> sehen Sie alle gebuchten Termine für
                den gewählten Sprechtag. Sie können dort auch Eltern- und Kindnamen direkt
                bearbeiten.
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">⏰ Verfügbarkeit anpassen</h3>
              <p class="line-height-3">
                Unter <strong>Termine → Meine Verfügbarkeit</strong> können Sie Ihre Von/Bis-Zeiten
                pro Sprechtag individuell anpassen und sich bei Bedarf als <em>inaktiv</em> setzen
                (dann sind Sie für Eltern nicht buchbar).
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">🔐 Login & Passwort</h3>
              <p class="line-height-3">
                Ihr Passwort wurde beim Import automatisch generiert. Sie können es unter
                <strong>Einstellungen</strong> jederzeit ändern. Bei Problemen wenden Sie sich bitte
                an Ihre Schuladministration.
              </p>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">📊 Alle Termine (nur Admins)</h3>
              <p class="line-height-3">
                Schuladministratoren sehen unter <strong>Termine → Alle Termine</strong> die
                Buchungen aller Lehrkräfte und können diese bei Bedarf löschen.
              </p>
            </div>
          </div>
        </TabPanel>

        <!-- Tab Datenschutz -->
        <TabPanel value="2">
          <div class="flex flex-column gap-4 mt-3">
            <div class="p-card p-4">
              <h3 class="mt-0">📦 Welche Daten werden gespeichert?</h3>
              <p class="line-height-3"><strong>Für Eltern:</strong></p>
              <ul class="line-height-3">
                <li>Name des Elternteils und Name des Kindes (nur zur Terminzuordnung)</li>
                <li>Eine anonyme Browser-ID (Cookie) zur Wiedererkennung Ihrer Buchungen</li>
                <li>Kein Login, keine E-Mail-Adresse erforderlich</li>
              </ul>
              <p class="line-height-3 mt-3"><strong>Für Lehrkräfte:</strong></p>
              <ul class="line-height-3">
                <li>Name, E-Mail-Adresse, Schule und Rolle</li>
                <li>Verfügbarkeitszeiten pro Sprechtag</li>
              </ul>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">🗑️ Wann werden die Daten gelöscht?</h3>
              <ul class="line-height-3">
                <li><strong>Buchungen von Eltern</strong> werden nach dem Sprechtag gelöscht.</li>
                <li>
                  <strong>Zeitslots</strong> werden mit dem Sprechtag deaktiviert und bereinigt.
                </li>
                <li>Das Browser-Cookie auf Ihrem Gerät läuft nach einem Jahr automatisch ab.</li>
              </ul>
            </div>

            <div class="p-card p-4">
              <h3 class="mt-0">🍪 Was ist dieses Cookie?</h3>
              <p class="line-height-3">
                Damit Sie Ihre Buchungen wiederfinden, speichert die Anwendung eine zufällige,
                anonyme ID in Ihrem Browser (Cookie). Diese ID enthält
                <strong>keine persönlichen Daten</strong>
                und wird nur verwendet, um Ihre Termine auf diesem Gerät anzuzeigen.
              </p>
            </div>
          </div>
        </TabPanel>
      </TabPanels>
    </Tabs>
  </div>
</template>

<script setup>
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
</script>

<style scoped>
.help-wrapper {
  max-width: 800px;
  margin: 0 auto;
}

ol,
ul {
  padding-left: 1.5rem;
}

li {
  margin-bottom: 0.4rem;
}
</style>
