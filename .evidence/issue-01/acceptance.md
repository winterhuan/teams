# Issue 01 acceptance trace

Commands use independent hearthd processes against one SQLite file.

## create
```json
{"ok":true,"value":{"projectId":"33c4cb85-be7e-4eb4-a114-ef3878593cd7","timelineEventId":"137ca6f2-6d1a-471e-9ce2-e88967b1dd7b","replayed":false}}
```

## idempotent replay
```json
{"ok":true,"value":{"projectId":"33c4cb85-be7e-4eb4-a114-ef3878593cd7","timelineEventId":"137ca6f2-6d1a-471e-9ce2-e88967b1dd7b","replayed":true}}
```

## grid read model
```json
{"ok":true,"value":{"projects":[{"projectId":"33c4cb85-be7e-4eb4-a114-ef3878593cd7","name":"Issue 01 Evidence","updatedAt":"2026-07-12T16:18:11.156Z","defaultSection":"chat"}]}}
```

## detail read model
```json
{"ok":true,"value":{"projectId":"33c4cb85-be7e-4eb4-a114-ef3878593cd7","name":"Issue 01 Evidence","rootPath":null,"createdAt":"2026-07-12T16:18:11.156Z","updatedAt":"2026-07-12T16:18:11.156Z","defaultSection":"chat"}}
```

## timeline
```json
{"ok":true,"value":[{"eventId":"137ca6f2-6d1a-471e-9ce2-e88967b1dd7b","type":"project.created","version":1,"projectId":"33c4cb85-be7e-4eb4-a114-ef3878593cd7","actor":{"type":"principal","id":"principal-local"},"object":{"type":"project","id":"33c4cb85-be7e-4eb4-a114-ef3878593cd7"},"reason":"Capture issue 01 acceptance evidence","idempotencyKey":"issue-01-evidence","occurredAt":"2026-07-12T16:18:11.156Z","recordedAt":"2026-07-12T16:18:11.156Z","payload":{"name":"Issue 01 Evidence","rootPath":null}}]}
```
