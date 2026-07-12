# Issue 02 real Provider acceptance trace

- Hearth Provider: `pi`
- Model provider/model: `agnes-ai/agnes-2.0-flash`
- Process: real local `pi` CLI; no fixture/fake adapter
- Credentials: omitted; child environment uses an allowlist and trace contains no raw secret

## Project command
```json
{"ok":true,"value":{"projectId":"79ca50c3-6265-4406-8eda-8f961dd08540","timelineEventId":"876668a6-742e-4728-8353-8373d4df4223","replayed":false}}
```

## Session result and durable read models
```json
{"ok":true,"value":{"threadId":"746eab0e-0264-4fe2-8576-f3be62a0ec99","turnId":"2886cd26-898d-416d-a5dd-50fac84d5e90","sessionId":"df7e55df-01f0-4e1e-b76a-93e05ecc869e","replayed":false,"hud":{"sessionId":"df7e55df-01f0-4e1e-b76a-93e05ecc869e","owner":{"type":"thread_turn","threadId":"746eab0e-0264-4fe2-8576-f3be62a0ec99","turnId":"2886cd26-898d-416d-a5dd-50fac84d5e90"},"status":"completed","hearthProviderId":"pi","modelProvider":"agnes-ai","model":"agnes-2.0-flash","cwd":"/var/folders/b7/m96mgydd5334jqqnhxtw0bmm0000gp/T/tmp.srk0T9Kuu7","budget":{"maxTurns":1},"lastEventAt":"2026-07-12T16:29:52.576Z"},"events":[{"type":"session.running","at":"2026-07-12T16:28:35.860Z","processId":58312},{"type":"session.completed","at":"2026-07-12T16:28:37.417Z","stopReason":"unknown","usage":{"input":0,"output":0,"totalTokens":0}},{"type":"assistant.delta","at":"2026-07-12T16:29:52.562Z","text":"\n\n"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.564Z","text":"HE"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.566Z","text":"ARTH"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.567Z","text":"_ISS"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.569Z","text":"UE"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.570Z","text":"_"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.572Z","text":"0"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.573Z","text":"2"},{"type":"assistant.delta","at":"2026-07-12T16:29:52.575Z","text":"_OK"},{"type":"session.completed","at":"2026-07-12T16:29:52.576Z","stopReason":"stop","usage":{"input":491,"output":619,"totalTokens":1302}}],"chat":{"messages":[{"role":"user","text":"Reply with exactly HEARTH_ISSUE_02_OK and nothing else."},{"role":"assistant","text":"\n\nHEARTH_ISSUE_02_OK"}]}}}
```
