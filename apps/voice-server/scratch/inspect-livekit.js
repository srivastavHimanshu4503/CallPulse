import * as rtc from '@livekit/rtc-node';
console.log('rtc-node classes:', Object.keys(rtc));
if (rtc.Room) {
  const roomProto = Object.getOwnPropertyNames(rtc.Room.prototype);
  console.log('Room prototype properties:', roomProto);
}
if (rtc.RemoteParticipant) {
  const participantProto = Object.getOwnPropertyNames(rtc.RemoteParticipant.prototype);
  console.log('RemoteParticipant prototype properties:', participantProto);
}
