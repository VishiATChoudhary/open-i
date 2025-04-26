<template>
  <div class="h-screen bg-white flex flex-col">
    <!-- Logo -->
    <div class="flex justify-center items-center gap-2 my-5">
      <img src="./assets/logo.svg" alt="Logo" class="h-8" />
      <span class="text-2xl font-semibold text-gray-800">Open i</span>
    </div>

    <!-- Main Content Container -->
    <div class="flex-1 min-h-0 flex flex-col md:flex-row md:gap-8 px-8">
      <div class="flex flex-col md:flex-1">
        <!-- Left Section: Video and Chat -->
        <div class="flex-1 flex flex-col mb-5">
          <VideoStream class="flex-[2]" />
          <div class="flex-1 flex justify-center gap-8 mt-4 md:mt-0">
            <AITranscript />
            <UserTranscript />
          </div>
        </div>

        <!-- Right Section: History (auf Mobile) -->
        <div class="block md:hidden w-full mb-5">
          <History />
        </div>
      </div>

      <!-- Right Section: History (auf Desktop) -->
      <div class="hidden md:block w-96 mb-5">
        <History />
      </div>
    </div>
  </div>
</template>

<script setup>
import VideoStream from './components/VideoStream.vue'
import UserTranscript from './components/UserTranscript.vue'
import AITranscript from './components/AITranscript.vue'
import History from './components/History.vue'
</script>