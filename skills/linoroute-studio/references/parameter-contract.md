# Connector parameter contract

Keep user language separate from the API payload. The connector should receive a structured object with only supported fields:

```json
{
  "model": "auto or an explicit model id",
  "mode": "text-to-image | image-to-image | text-to-video | image-to-video",
  "prompt": "required creative instruction",
  "aspect_ratio": "model-supported value",
  "size_or_resolution": "model-supported value",
  "quality": "model-supported value",
  "format": "model-supported value",
  "duration_seconds": 5,
  "count": 1,
  "reference_files": []
}
```

Do not send fields that are unsupported for the resolved model. Distinguish output dimensions from upload byte limits and from file format. Use `count: 1` unless the user asks for more. The connector, not the model-facing prompt, is responsible for API-key validation, balance checks, rate limits, polling, and safe error messages.
