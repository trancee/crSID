
#ifdef CRSID_PLATFORM_PC

#include <SDL.h>


void cRSID_soundCallback(void* userdata, unsigned char *buf, int len) {
 cRSID_C64.SoundStarted=1;
 cRSID_generateSound( (cRSID_C64instance*)userdata, buf, len );
}


void* cRSID_initSound(cRSID_C64instance* C64, unsigned short samplerate, unsigned short buflen) {
 static SDL_AudioSpec soundspec;
 C64->SoundStarted=0;
 if ( SDL_Init(SDL_INIT_AUDIO) < 0 ) {
  fprintf(stderr, "Couldn't initialize SDL-Audio: %s\n",SDL_GetError()); return NULL;
 }
 soundspec.freq=samplerate; soundspec.channels=2; soundspec.format=AUDIO_S16;
 soundspec.samples=buflen; soundspec.userdata=C64; soundspec.callback=cRSID_soundCallback;
 if ( SDL_OpenAudio(&soundspec, NULL) < 0 ) {
  fprintf(stderr, "Couldn't open audio: %s\n", SDL_GetError()); return NULL;
 }
 return (void*)&soundspec;
}


void cRSID_closeSound (void) {
 SDL_PauseAudio(1);
 if (cRSID_C64.SoundStarted) { //SDL_CloseAudio of SDL might freeze if somehow sound-callback didn't start
  SDL_CloseAudio();
 }
}


void cRSID_startSound (void) {
 SDL_PauseAudio(0);
}


void cRSID_stopSound (void) {
 SDL_PauseAudio(1);
}


void cRSID_generateSound(cRSID_C64instance* C64, unsigned char *buf, unsigned short len) {
 static unsigned short i; static unsigned char j;
 static cRSID_Output Output;
 static signed short OutputL, OutputR;

 for (i=0; i<len; i+=4) {
  for(j=0; j<C64->PlaybackSpeed; ++j) Output=cRSID_generateSample(C64);
  Output.L = Output.L * C64->MainVolume / 256; Output.R = Output.R * C64->MainVolume / 256;
  buf[i+0] = Output.L&0xFF; buf[i+1] = Output.L>>8;
  buf[i+2] = Output.R&0xFF; buf[i+3] = Output.R>>8;
 }
}


#endif


static inline cRSID_Output cRSID_generateSample (cRSID_C64instance* C64) { //call this from custom buffer-filler
 static cRSID_Output Output; signed short PSIDdigi;
 Output = cRSID_emulateC64(C64);
 if (C64->PSIDdigiMode) { PSIDdigi = cRSID_playPSIDdigi(C64); Output.L += PSIDdigi; Output.R += PSIDdigi; }
 if (Output.L>=32767) Output.L=32767; else if (Output.L<=-32768) Output.L=-32768; //saturation logic on overflow
 if (Output.R>=32767) Output.R=32767; else if (Output.R<=-32768) Output.R=-32768; //saturation logic on overflow
 return Output;
}

