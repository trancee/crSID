// cRSID - a lightweight (integer-only) RealSID playback environment by Hermit

#ifndef CRSID_PLATFORM_PC
 #define CRSID_PLATFORM_PC
#endif

#include <stdlib.h>
#include <stdio.h>
#include <string.h>
#include <unistd.h>
#ifdef LINUX
  #include <termios.h> //<curses.h>
#elif defined(WINDOWS)
 #include <conio.h>
#endif
#include "libcRSID.c"


#define FFWD_SPEED 4 //times

static const char ChannelChar[] = {'-','L','R','M'};


#include "GUI/GUI.c"


#define DEFAULT_SUBTUNE 1 //1..
#define DEFAULT_SAMPLERATE 44100
#define BUFFERSIZE_MIN       256
#define BUFFERSIZE_DEFAULT  8192
#define BUFFERSIZE_MAX     32768


char* getFileExtension(char *filename) { //get pointer of file-extension from filename string  //if no '.' found, point to end of the string
 char* LastDotPos = strrchr(filename,'.'); if (LastDotPos == NULL) return (filename+strlen(filename)); //make strcmp not to find match, otherwise it would be segmentation fault
 return LastDotPos;
}


void setKeyCapture (char state) {
 #ifdef LINUX
  struct termios TTYstate;
  tcgetattr(STDIN_FILENO, &TTYstate);
  if (state) TTYstate.c_lflag &= ~ICANON; else TTYstate.c_lflag |= ICANON;
  tcsetattr(STDIN_FILENO, TCSANOW, &TTYstate);
 #endif
}


int main (int argc, char *argv[]) {

 char i, ArgFileIdx, ArgSubtuneIdx, Info=0, CLImode=0; int ArgMainVolume=0;
 char PressedKeyChar=0, Exit=0;
 char *SIDfileName;
 char SubTune=0, CIAisSet;
 short PrevFrameCycles;
 FILE *fp;
 cRSID_SIDheader *SIDheader;
 cRSID_C64instance *C64;

 void printUsage() {
  static char WasDisplayed=0;
  if(!WasDisplayed) printf("Usage of cRSID-"VERSION" (parameters can follow in any order):\n"
                           "crsid <Filename.sid> [ -cli |  | Subtunenumber | -info | -stereo | -sid6581 | -sid8580 | -sidlight | -bufsize <256..32768> | -volume <0..255> ] \n");
  WasDisplayed=1;
 }

 i=1; cRSID_C64.BufferSize=BUFFERSIZE_DEFAULT;
 while (i<argc) {
  if (!strcmp(argv[i],"-bufsize")) {
   ++i;
   if(i<argc) {
    sscanf(argv[i],"%d",&cRSID_C64.BufferSize);
    if(cRSID_C64.BufferSize<256) cRSID_C64.BufferSize=256;
    if(32768<cRSID_C64.BufferSize) cRSID_C64.BufferSize=32768;
   }
  }
  ++i;
 }
 C64 = cRSID_init( DEFAULT_SAMPLERATE, cRSID_C64.BufferSize );
 if (C64==NULL) exit(CRSID_ERROR_INIT);

 i=1; ArgFileIdx=ArgSubtuneIdx=0;
 while (i<argc) {
  if (!strcmp(argv[i],"-h") || !strcmp(argv[i],"-?") || !strcmp(argv[i],"-help") || !strcmp(argv[i],"--h") || !strcmp(argv[i],"--help")) printUsage();
  else if (!strcmp(argv[i],"-info")) Info=1;
  else if (!strcmp(argv[i],"-cli")) CLImode=1;
  else if (!strcmp(argv[i],"-sid6581")) { cRSID_C64.SelectedSIDmodel=6581; }
  else if (!strcmp(argv[i],"-sid8580")) { cRSID_C64.SelectedSIDmodel=8580; }
  else if (!strcmp(argv[i],"-stereo")) { cRSID_C64.Stereo=1; } //mono/stereo
  else if (!strcmp(argv[i],"-sidlight")) { cRSID_C64.HighQualitySID=0; } //high-quality SID with 7x wavesample-rate (good for combined waveforms)
  else if (!strcmp(argv[i],"-volume")) {
   ++i;
   if(i<argc) {
    sscanf(argv[i],"%d",&ArgMainVolume);
    if(ArgMainVolume<0) C64->MainVolume=0;
    else if(255<ArgMainVolume) C64->MainVolume=255;
    else C64->MainVolume = ArgMainVolume;
   }
  }
  else if ( !strcmp(getFileExtension(argv[i]),".sid") || !strcmp(getFileExtension(argv[i]),".SID") ) { //check file-extension and/or magic-string!
   if ((fp=fopen(argv[i],"rb")) != NULL ) { ArgFileIdx=i; fclose(fp); }
  }
  else { sscanf(argv[i],"%d",&SubTune); if(1<SubTune && SubTune<256) ArgSubtuneIdx=i; else SubTune=DEFAULT_SUBTUNE; }
  ++i;
 }
 if (ArgFileIdx) SIDfileName = argv[ArgFileIdx];  else { printUsage(); return 0; }


 if ( (SubTune==0 && Info==0) || CLImode==0 ) {
  if (CLImode || SubTune==0) SubTune=1; else sscanf(argv[2],"%d",&SubTune);
  cRSID_C64.SIDheader = SIDheader = cRSID_playSIDfile( C64, SIDfileName, SubTune );
 }
 else { //CLI detailed playback

  sscanf(argv[2],"%d",&SubTune);
  if ( (SIDheader = cRSID_loadSIDtune(C64,SIDfileName)) == NULL ) { printf("Load error!\n"); return CRSID_ERROR_LOAD; }

  startsubtune:
  cRSID_initSIDtune(C64,SIDheader,SubTune); C64->PlaybackSpeed=1; C64->Paused=0;

  printf("Author: %s , Title: %s , Info: %s\n",
         SIDheader->Author, SIDheader->Title, SIDheader->ReleaseInfo);

  printf("Load-address:$%4.4X, End-address:$%4.4X, Size:%d bytes\n", C64->LoadAddress, C64->EndAddress, C64->EndAddress - C64->LoadAddress);
  printf("Init-address:$%4.4X, ", C64->InitAddress);
  if (!C64->RealSIDmode) {
   printf("Play-address:$%4.4X, ", C64->PlayAddress);
   if (SIDheader->PlayAddressH==0 && SIDheader->PlayAddressL==0) printf("(IRQ), ");
  }
  printf("Subtune:%d (of %d)", C64->SubTune, SIDheader->SubtuneAmount);
  if (C64->RealSIDmode) printf(", RealSID");
  else if (C64->PSIDdigiMode) printf(", PSID-digi");
  printf("\n");

  printf("SID1:$%4.4X,%d(%c) ", C64->SID[1].BaseAddress, C64->SID[1].ChipModel, ChannelChar[C64->SID[1].Channel]);
  if (C64->SID[2].BaseAddress) printf("SID2:$%4.4X,%d(%c) ", C64->SID[2].BaseAddress, C64->SID[2].ChipModel, ChannelChar[C64->SID[2].Channel]);
  if (C64->SID[3].BaseAddress) printf("SID3:$%4.4X,%d(%c) ", C64->SID[3].BaseAddress, C64->SID[3].ChipModel, ChannelChar[C64->SID[3].Channel]);
  if (C64->SID[4].BaseAddress) printf("SID4:$%4.4X,%d(%c) ", C64->SID[4].BaseAddress, C64->SID[4].ChipModel, ChannelChar[C64->SID[4].Channel]);
  printf("\n");

  PrevFrameCycles = C64->FrameCycles;
  if (!C64->RealSIDmode) {
   printf( "Speed: %.1fx (player-call at every %d cycle) TimerSource:%s ",
           (C64->VideoStandard<=1? 19656.0:17095.0) / C64->FrameCycles, C64->FrameCycles, C64->TimerSource? "CIA":"VIC" );
  }
  printf ("Standard:%s\n",
          C64->VideoStandard? "PAL":"NTSC" );

  cRSID_playSIDtune();


  usleep (100000);
  if ( C64->FrameCycles != PrevFrameCycles ) {
   if(!CIAisSet) { CIAisSet=1; printf("New FrameSpeed: %.1fx (%d cycles between playercalls)\n",
                                      (C64->VideoStandard<=1? 19656.0:17095.0) / C64->FrameCycles, C64->FrameCycles); }
  }

 }

 C64->PlaybackSpeed=1; C64->Paused=0;

 if (CLImode) {
  printf("Press ENTER to abort playback, SPACE to pause/continue, TAB for fast-forward/normal, 1..9 for subtune...\n"); //getchar();
  setKeyCapture(1);
  while(!Exit) {
   PressedKeyChar=
   #ifdef LINUX
    getchar();
   #elif defined(WINDOWS)
    getch();
   #endif
   //printf("%2.2X\n",PressedKeyChar);
   if(PressedKeyChar==27 || PressedKeyChar=='\n' || PressedKeyChar=='\r') Exit=1; //ESC/Enter?
   else if (PressedKeyChar==' ') { C64->PlaybackSpeed=1; C64->Paused^=1; if(C64->Paused) cRSID_pauseSIDtune(); else cRSID_playSIDtune(); }
   else if (PressedKeyChar==0x09 || PressedKeyChar=='`') { if(C64->PlaybackSpeed==1) C64->PlaybackSpeed = FFWD_SPEED; else C64->PlaybackSpeed = 1; }
   else if ('1'<=PressedKeyChar &&  PressedKeyChar<='9') { SubTune=PressedKeyChar-'1'+1; cRSID_pauseSIDtune(); goto startsubtune; }
   else C64->PlaybackSpeed=1;
   usleep(5000);
  }
  setKeyCapture(0);
 }

 else { //GUI
  initGUI();
  mainLoop(C64);
 }

 cRSID_close();
 return 0;
}
