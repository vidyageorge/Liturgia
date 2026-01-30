# ✝️ Liturgia

**Sacred Ministry Roster for St. Mathias English Community**

A beautiful web application to manage church readers, liturgy assignments, and special event planning.

## Features

- 📖 **Reader Management** - Track all community members who participate in readings
- 🗓️ **Mass Scheduling** - Assign readers to different mass types (Sunday, Christmas, Easter, etc.)
- 👥 **Community Structure** - Manage liturgy, choir, catechism, and volunteer groups
- 🎄 **Special Events** - Handle unique requirements for Christmas, Easter, Palm Sunday, and more
- 📊 **History Tracking** - Keep records of who read at which mass

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Liturgia
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   venv\Scripts\activate  # Windows
   # or
   source venv/bin/activate  # Linux/Mac
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application**
   ```bash
   python app.py
   ```

5. **Open in browser**
   ```
   http://localhost:5000
   ```

## Mass Types Supported

| Mass Type | Default Time | Special Roles |
|-----------|-------------|---------------|
| Sunday Mass | 7:15 AM | Standard readings |
| Christmas | - | Carols |
| New Year | 11:00 PM | Thanksgiving |
| Palm Sunday | 7:30 AM | Gospel Narration |
| Maundy Thursday | 5:30 PM | 12 Apostles |
| Good Friday | 5:30 PM | Morning Adoration, Gospel Narration |
| Easter | 11:15 PM | Three readings |
| All Souls Day | 7:15 AM | Departed Souls Reader |

## License

Made with ❤️ for St. Mathias English Community

