# jar-of-hearts/app.py
# built at 2am with too much coffee and a broken heart
# or maybe a hopeful one? idk anymore

from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import random
import os

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# --------------------------------------------------
# message library
# --------------------------------------------------

PRESET_MESSAGES = {
    "flirty": [
        "If smiles were crimes, you'd be serving life 😉",
        "Is it hot in here or is it just you?",
        "You + me = dangerously cute energy.",
        "I blame you for my stupid grin.",
        "Stop being so attractive, it's distracting.",
        "Careful. i bite. softly.",
        "You are my favorite distraction.",
        "My heart did a little backflip. rude.",
    ],
    "romantic": [
        "I would choose you in every lifetime.",
        "You feel like home.",
        "loving you feels effortless.",
        "my heart recognized yours instantly.",
        "you are my always.",
        "in a world of chaos, you are my peace.",
        "every love song makes sense now.",
        "you are my once-in-a-lifetime.",
    ],
    "warm": [
        "i hope you know how loved you are.",
        "you make the world softer just by existing.",
        "thank you for being you.",
        "you matter more than you realize.",
        "i'm always rooting for you.",
        "you deserve gentle things.",
        "you bring light with you.",
        "stay exactly as you are.",
    ],
    "apology": [
        "i'm sorry for the hurt i caused.",
        "you deserved better from me.",
        "i never meant to make you feel small.",
        "i hope we can heal this.",
        "i care more than my ego.",
        "you matter more than being right.",
        "i'm trying to grow.",
        "i'm sorry, truly.",
    ],
    "missing_you": [
        "i miss you more than i expected to.",
        "it's quieter without you.",
        "i keep thinking about you.",
        "come back to me soon.",
        "i miss your laugh.",
        "everything reminds me of you.",
        "i hope you miss me too.",
        "come sit next to me again.",
    ],
    "grateful": [
        "thank you for choosing me.",
        "i'm grateful for your heart.",
        "you changed my life quietly.",
        "thank you for loving me.",
        "you make my world better.",
        "i treasure you.",
        "thank you for staying.",
        "i'm endlessly grateful for you.",
    ]
}

OPEN_WHEN_PROMPTS = [
    "open when you miss me",
    "open when you're sad",
    "open when you need a smile",
    "open when you can't sleep",
    "open when you feel lost",
    "open when you need a hug",
    "open when you doubt yourself",
    "open when you're angry at me",
    "open when you feel alone",
    "open when you need to laugh",
]

# --------------------------------------------------
# database models
# --------------------------------------------------

class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    unique_link = db.Column(db.String(10), unique=True, nullable=False)
    sender_name = db.Column(db.String(50), nullable=False)
    receiver_name = db.Column(db.String(50), nullable=False)
    message_style = db.Column(db.String(20), nullable=False)
    custom_message = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # new features
    password = db.Column(db.String(100), nullable=True)
    scheduled_for = db.Column(db.DateTime, nullable=True)
    reply_message = db.Column(db.Text, nullable=True)
    reply_sent_at = db.Column(db.DateTime, nullable=True)
    open_count = db.Column(db.Integer, default=0)

    # bear
    bear_sent_back = db.Column(db.Boolean, default=False)
    bear_sent_at = db.Column(db.DateTime, nullable=True)

    # open when letters (stored as | separated)
    open_when_notes = db.Column(db.Text, nullable=True)

    def __repr__(self):
        return f"<Message from {self.sender_name} to {self.receiver_name}>"

    def get_open_when_list(self):
        if not self.open_when_notes:
            return []
        items = []
        for entry in self.open_when_notes.split('||'):
            if '::' in entry:
                prompt, note = entry.split('::', 1)
                items.append({'prompt': prompt, 'note': note})
        return items

with app.app_context():
    db.create_all()
    print("✨ database is ready. love is stored safely.")

# --------------------------------------------------
# helpers
# --------------------------------------------------

def generate_code():
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    code = ''.join(random.choices(chars, k=8))
    while Message.query.filter_by(unique_link=code).first():
        code = ''.join(random.choices(chars, k=8))
    return code

# --------------------------------------------------
# routes
# --------------------------------------------------

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create', methods=['POST'])
def create():
    sender   = request.form.get('sender', '').strip()
    receiver = request.form.get('receiver', '').strip()
    style    = request.form.get('style', '').strip()
    message  = request.form.get('message', '').strip()
    password = request.form.get('password', '').strip()
    scheduled_str = request.form.get('scheduled_for', '').strip()

    # open when letters
    ow_prompts = request.form.getlist('ow_prompt')
    ow_notes   = request.form.getlist('ow_note')

    if not all([sender, receiver, style]):
        return "hey, fill in the required fields! 💕", 400

    if not message:
        if style in PRESET_MESSAGES:
            message = random.choice(PRESET_MESSAGES[style])
        else:
            message = "someone is thinking of you 💌"

    # parse scheduled time
    scheduled_dt = None
    if scheduled_str:
        try:
            scheduled_dt = datetime.strptime(scheduled_str, '%Y-%m-%dT%H:%M')
        except:
            pass

    # build open when string
    open_when_str = None
    pairs = [(p.strip(), n.strip()) for p, n in zip(ow_prompts, ow_notes) if p.strip() and n.strip()]
    if pairs:
        open_when_str = '||'.join(f"{p}::{n}" for p, n in pairs)

    code = generate_code()

    new_message = Message(
        unique_link=code,
        sender_name=sender,
        receiver_name=receiver,
        message_style=style,
        custom_message=message,
        password=password if password else None,
        scheduled_for=scheduled_dt,
        open_when_notes=open_when_str
    )

    db.session.add(new_message)
    db.session.commit()

    share_link = url_for('view_jar', code=code, _external=True)
    return render_template('created.html', link=share_link, receiver=receiver)

@app.route('/jar/<code>')
def view_jar(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()

    # scheduled check
    if message.scheduled_for and datetime.utcnow() < message.scheduled_for:
        return render_template('not_yet.html', message=message)

    # password check — show lock page if not unlocked
    unlocked = request.args.get('unlocked') == '1'
    if message.password and not unlocked:
        return render_template('locked.html', message=message)

    # count opens
    message.open_count += 1
    db.session.commit()

    style_emojis = {
        'flirty':      '💋🔥',
        'romantic':    '💕✨',
        'warm':        '☀️🧸',
        'apology':     '🥺💙',
        'missing_you': '🌙💌',
        'grateful':    '💖✨'
    }
    style_intros = {
        'flirty':      "psst... someone couldn't resist:",
        'romantic':    "a message written in the stars:",
        'warm':        "a little warmth from someone who cares:",
        'apology':     "a heart trying to make things right:",
        'missing_you': "someone has been thinking about you:",
        'grateful':    "a heart full of gratitude says:"
    }

    return render_template(
        'jar.html',
        message=message,
        emoji=style_emojis.get(message.message_style, '💌'),
        intro=style_intros.get(message.message_style, 'someone sent you this:'),
        open_when_list=message.get_open_when_list()
    )

@app.route('/unlock/<code>', methods=['POST'])
def unlock(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()
    entered = request.form.get('password', '').strip()
    if entered == message.password:
        return redirect(url_for('view_jar', code=code, unlocked='1'))
    else:
        return render_template('locked.html', message=message, error="wrong password 💔 try again")

@app.route('/send-bear/<code>', methods=['POST'])
def send_bear(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()
    if not message.bear_sent_back:
        message.bear_sent_back = True
        message.bear_sent_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'message': '🐻 teddy bear sent! they will know you care.'})
    return jsonify({'success': False, 'message': 'you already sent a bear! one is enough to melt a heart.'})

@app.route('/send-reply/<code>', methods=['POST'])
def send_reply(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()
    reply = request.form.get('reply', '').strip()
    if reply and not message.reply_message:
        message.reply_message = reply
        message.reply_sent_at = datetime.utcnow()
        db.session.commit()
        return jsonify({'success': True, 'message': '💌 your reply is on its way!'})
    elif message.reply_message:
        return jsonify({'success': False, 'message': 'you already sent a reply 💕'})
    return jsonify({'success': False, 'message': 'write something first!'})

@app.route('/check-status/<code>')
def check_status(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()
    return jsonify({
        'bear_sent': message.bear_sent_back,
        'bear_sent_at': message.bear_sent_at.strftime('%B %d at %I:%M %p') if message.bear_sent_at else None,
        'reply': message.reply_message,
        'reply_sent_at': message.reply_sent_at.strftime('%B %d at %I:%M %p') if message.reply_sent_at else None,
        'open_count': message.open_count
    })

@app.route('/check-bear/<code>')
def check_bear(code):
    message = Message.query.filter_by(unique_link=code).first_or_404()
    return jsonify({
        'bear_sent': message.bear_sent_back,
        'sent_at': message.bear_sent_at.strftime('%B %d, %Y at %I:%M %p') if message.bear_sent_at else None
    })

@app.route('/secret')
def secret():
    return render_template('secret.html')

if __name__ == '__main__':
    app.run(debug=True)

