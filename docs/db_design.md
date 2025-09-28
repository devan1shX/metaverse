# DB DESGIGN 

#Type[ENUM]:
    participant
    admin

## user
## admin
```
   user_id - unique , integer, not null, auto increment
   role:Type,not-null,default:Type.participant
   user_name - string, not null, unique
   user_description - text, not null
   user_created_at - timestamp, not null, default current_timestamp
   user_updated_at - timestamp, not null, default current_timestamp
   user_avatar_url - string, not null
   user_about - text, not null
   user_is_active - boolean, not null, default true
   updated_at - timestamp, not null, default current_timestamp
   avatar_url - string, not null
   about - text, not null
   is_active - boolean, not null, default true
```

## SPACE 
```
    space_id - unique , integer, not null, auto increment
    space_name - string, not null
    space_description - text, not null
    space_thumbnail - json, not null , default : defaultThumbnail (empty thumbnail json)
    space_max_capacity - integer, not null, default 50
    space_settings - json, not null , default : defaultSettings (empty settings json)
    is_public - boolean, not null, default true
    map:Map,not-null,default : defaultMap
    users - List[user]
    name - string, not null, default : "Space"
    description - text, not null, default : "Description"
    created_at - timestamp, not null, default current_timestamp
    owner_id - integer, not null, foreign key to users.user_id
    updated_at - timestamp, not null, default current_timestamp
```

## Map 
```
    map_id - unique , integer, not null, auto increment
    map_name - string, not null
    map_description - text, not null
    map_thumbnail - json, not null , default : defaultThumbnail (empty thumbnail json)
    is_public - boolean, not null, default true
    elements - List[element]
```

# Element
```
    element_id - unique , integer, not null, auto increment
    element_display_name - string, not null
    element_view: json,not-null
    element_x:str,not-null
    element_y:str,not-null
```

## Avatar
``` 
  id       String  @id @unique @default(cuid())
  imageUrl String,not-null
  name     String,not-null

```