<template>
  <div class="fixed inset-0">
    <!-- Top gradient with logo -->
    <div class="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#484848] via-[#484848]/50 to-transparent">
      <div class="flex justify-center items-center h-full">
        <img src="../assets/logo.svg" alt="Logo" class="h-12" />
      </div>
    </div>

    <!-- Features panel -->
    <div class="absolute top-1/2 right-8 -translate-y-1/2 bg-[#FAF9F6]/95 rounded-3xl p-6 w-80 h-[60vh]">
      <h2 class="text-xl font-semibold mb-4 text-center">Features</h2>
      <div class="space-y-3">
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Bäckerei in 10m rechts</span>
          <span class="text-gray-400 font-mono">14:23:53</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Hund nicht an der Leine</span>
          <span class="text-gray-400 font-mono">14:24:12</span>
        </div>
        <div class="flex justify-between items-center">
          <span class="text-gray-500">Rote Ampel in 20m</span>
          <span class="text-gray-400 font-mono">14:24:35</span>
        </div>
      </div>
    </div>
  </div>
</template> 