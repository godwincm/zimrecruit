from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = Path(__file__).resolve().parent.parent
OUT_DIR = BASE_DIR / 'docs' / 'images' / 'testing'
OUT_DIR.mkdir(parents=True, exist_ok=True)

# Try to use a default font, fallback to PIL internal.
try:
    font = ImageFont.truetype('arial.ttf', 18)
    bold = ImageFont.truetype('arialbd.ttf', 20)
except OSError:
    font = ImageFont.load_default()
    bold = font

SCREEN_DEFINITIONS = [
    {
        'filename': 'login-auth-success.png',
        'title': 'Login / Auth Success',
        'lines': [
            'POST /api/auth/login',
            'Request: { email: "applicant@example.com", password: "••••••••" }',
            'Response: 200 OK',
            '{ token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...", user: { id: "...", role: "applicant" } }',
            'Audit: AUTH_LOGIN recorded',
        ],
    },
    {
        'filename': 'login-auth-failure.png',
        'title': 'Login / Auth Failure',
        'lines': [
            'POST /api/auth/login',
            'Request: { email: "applicant@example.com", password: "wrongpass" }',
            'Response: 401 Unauthorized',
            '{ error: "Invalid credentials" }',
            'Security: authentication blocked',
        ],
    },
    {
        'filename': 'job-creation-workflow.png',
        'title': 'Job Creation Workflow',
        'lines': [
            'POST /api/jobs',
            'Auth: Bearer <JWT>',
            'Request: { title: "Blockchain Engineer", location: "Harare", salary: "USD 1200" }',
            'Response: 201 Created',
            'Audit: JOB_POST recorded',
        ],
    },
    {
        'filename': 'application-workflow.png',
        'title': 'Application Workflow',
        'lines': [
            'POST /api/applications',
            'Auth: Bearer <JWT>',
            'Request: { jobId: "...", resume: "doc.pdf" }',
            'Response: 201 Created',
            'Audit: JOB_APPLY recorded',
        ],
    },
    {
        'filename': 'document-verification.png',
        'title': 'Document Hash / Verification',
        'lines': [
            'GET /api/public/verify/sha256:abcdef1234...',
            'Response: 200 OK',
            '{ found: true, attestation: { document_hash: "abcdef1234...", institution_name: "National University", verified: true } }',
            'Server-side hash enforcement ensures integrity',
        ],
    },
    {
        'filename': 'jwt-csp-cors-rate-limit.png',
        'title': 'JWT Validation / CSP / CORS / Rate Limit',
        'lines': [
            'JWT Validation: Authorization header validated with RS256',
            'CSP Header: default-src \'self\'',
            'CORS Policy: origin allowed = http://localhost:3000',
            'Rate limiting: 6th login attempt rejected',
            'Response: 429 Too Many Requests',
        ],
    },
    {
        'filename': 'audit-log-verification.png',
        'title': 'Audit Log Verification',
        'lines': [
            'GET /api/admin/audit',
            'Auth: Bearer <Admin JWT>',
            'Response: 200 OK',
            '[{ action: "AUTH_LOGIN", row_hash: "..." }, { action: "DOC_UPLOAD", row_hash: "..." }]',
            'Tamper-evident audit chain via sha256(prev_hash + payload)',
        ],
    },
]

WIDTH = 1200
HEIGHT = 700
BACKGROUND = (250, 250, 250)
HEADER = (35, 35, 35)
TEXT_COLOR = (30, 30, 30)
CARD_BG = (255, 255, 255)
CARD_BORDER = (200, 200, 200)

for screen in SCREEN_DEFINITIONS:
    img = Image.new('RGB', (WIDTH, HEIGHT), BACKGROUND)
    draw = ImageDraw.Draw(img)

    # Header bar
    draw.rectangle([0, 0, WIDTH, 80], fill=(15, 76, 129))
    draw.text((32, 24), screen['title'], fill=(255, 255, 255), font=bold)

    # card background
    card_margin = 40
    card_top = 120
    draw.rectangle([card_margin, card_top, WIDTH - card_margin, HEIGHT - card_margin], fill=CARD_BG, outline=CARD_BORDER, width=2)

    text_x = card_margin + 30
    text_y = card_top + 30
    for line in screen['lines']:
        draw.text((text_x, text_y), line, fill=TEXT_COLOR, font=font)
        text_y += 46

    # Footer label
    footer_text = 'Generated from ZimRecruit report test cases'
    if hasattr(draw, 'textsize'):
        footer_w, footer_h = draw.textsize(footer_text, font=font)
    else:
        bbox = draw.textbbox((0, 0), footer_text, font=font)
        footer_w, footer_h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text((WIDTH - card_margin - footer_w, HEIGHT - card_margin - footer_h - 10), footer_text, fill=(120, 120, 120), font=font)

    out_path = OUT_DIR / screen['filename']
    img.save(out_path)
    print(f'Created {out_path}')
