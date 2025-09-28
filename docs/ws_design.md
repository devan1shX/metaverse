# WS DESIGN 

communication over the ws between any clients will be done via Events 
so an event will be a json object.An event has a scope,which defines the users we want to broadcast the event to.
- If the scope is a admin, the event will be broadcast to all admins.
- If the scope is a participant, the event will be broadcast to all users.
- In future we can have different roles like moderators and admins, so we can broadcast the event to the particular one.

## Events(ENUM):
```
Events(ENUM):
    type: string,not-null
    data: json,not-null
    sender_id: string,not-null
    receiver_id: string,not-null
    timestamp: timestamp,not-null
    scope: [Type] ,not-null ,default:Type.user
```

```
Events:[Joining,Joined,Info,Leaving,Left,Moving,Speaking,Video,Audio,Chat]
```

scopes :    
    - Event.Joining : Type.participant
    - Event.Joined : Type.participant
    - Event.Leaving : Type.participant
    - Event.Left : Type.participant
    - Event.Moving : Type.participant
    - Event.Speaking : Type.admin,Event.speakingSide,Event.ListeningEnd
    - Event.Video : Type.admin,Event.videoSide,Event.videoEnd
    - Event.Audio : Type.admin,Event.audioSide,Event.audioEnd
    - Event.Chat : Type.admin,Event.chatSide,Event.chatEnd

## User Events
### Joining
```
{
  type: 'Event.Joined',
  data: {
    userId: string, not-null
    space_id: string  , not-null
  }
  scope: Type.participant
}
```

### Leaving
```
{
  type: 'Event.Left',
  data: {
    userId: string, not-null 
    space_id: string, not-null
  }
  scope: Type.participant
}
```
```
### Moving
```
{
  type: 'Event.Moving',
  data: {
    userId: string, not-null
    space_id: string, not-null
    x: number, not-null
    y: number, not-null
  }
  scope: Type.participant
}
```

### Speaking
```
{
  type: 'Event.Speaking',
  data: {
    userId: string, not-null
    space_id: string, not-null
  }
  scope: Type.admin
  speakingSide: user.user_id, not-null
  listeningEnd: user.user_id, not-null
}
```
```
### Video
```
{
  type: 'Event.Video',
  data: {
    userId: string, not-null
    space_id: string, not-null
  }
  scope: Type.admin
  videoSide: user.user_id, not-null
  videoEnd: user.user_id, not-null
}
```
```
### Audio
```
{
  type: 'Event.Audio',
  data: {
    userId: string, not-null
    space_id: string, not-null
  }
  scope: Type.admin
  audioSide: user.user_id, not-null
  audioEnd: user.user_id, not-null
}
```
```
### Chat
```
{
  type: 'Event.Chat',
  data: {
    userId: string, not-null
    space_id: string, not-null
  }
  scope: Type.admin
  chatSide: user.user_id, not-null
  chatEnd: user.user_id, not-null
}
```
```
### Info
```
{
  type: 'Event.Info',
  data: {
    userId: string, not-null
    space_id: string, not-null
  }
}
  scope: Type.admin
  infoSide: user.user_id, not-null
  infoEnd: user.user_id, not-null
```
