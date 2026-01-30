from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

# Association table for many-to-many relationship between members and roles
member_roles = db.Table('member_roles',
    db.Column('member_id', db.Integer, db.ForeignKey('member.id'), primary_key=True),
    db.Column('role_id', db.Integer, db.ForeignKey('community_role.id'), primary_key=True)
)

class Member(db.Model):
    """Church community member who can participate in readings"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    phone = db.Column(db.String(20))
    email = db.Column(db.String(100))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    experience_level = db.Column(db.String(20))  # 'new', 'regular', 'experienced', or None for auto
    years_of_service = db.Column(db.Integer)  # Optional: how many years they've been reading
    
    # Relationships
    roles = db.relationship('CommunityRole', secondary=member_roles, backref='members')
    assignments = db.relationship('MassAssignment', backref='member', lazy='dynamic')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email,
            'active': self.active,
            'experience_level': self.experience_level,
            'years_of_service': self.years_of_service,
            'roles': [role.name for role in self.roles]
        }

class Priest(db.Model):
    """Priests/Celebrants who conduct masses"""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(20), default='Fr.')  # Fr., Rev., Bishop, etc.
    phone = db.Column(db.String(20))
    active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'title': self.title,
            'full_name': f"{self.title} {self.name}" if self.title else self.name,
            'phone': self.phone,
            'active': self.active
        }

class CommunityRole(db.Model):
    """Community level roles like Liturgy Incharge, Choir Incharge, etc."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50))  # liturgy, choir, catechism, volunteers, executive
    description = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'category': self.category,
            'description': self.description,
            'members': [m.name for m in self.members]
        }

class MassType(db.Model):
    """Types of masses - Sunday, Christmas, Easter, etc."""
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)  # Sunday Mass, Christmas, Easter, etc.
    default_time = db.Column(db.String(20))  # 7:15 AM, 11:15 PM, etc.
    description = db.Column(db.Text)
    is_special_event = db.Column(db.Boolean, default=False)
    
    # JSON field to store which reading roles are needed for this mass type
    # e.g., ["introduction", "first_reading", "second_reading", "prayer_of_faithful"]
    required_roles = db.Column(db.Text)  # Stored as JSON string
    
    # Special fields for unique mass requirements
    has_gospel_narration = db.Column(db.Boolean, default=False)
    has_mc_reader = db.Column(db.Boolean, default=False)
    has_third_reading = db.Column(db.Boolean, default=False)
    has_apostles = db.Column(db.Boolean, default=False)  # For Maundy Thursday
    has_thanksgiving = db.Column(db.Boolean, default=False)  # For New Year
    has_carols = db.Column(db.Boolean, default=False)  # For Christmas
    has_morning_adoration = db.Column(db.Boolean, default=False)  # For Good Friday
    has_departed_souls_reader = db.Column(db.Boolean, default=False)  # For All Souls Day
    
    masses = db.relationship('Mass', backref='mass_type', lazy='dynamic')
    
    def to_dict(self):
        import json
        return {
            'id': self.id,
            'name': self.name,
            'default_time': self.default_time,
            'description': self.description,
            'is_special_event': self.is_special_event,
            'required_roles': json.loads(self.required_roles) if self.required_roles else [],
            'has_gospel_narration': self.has_gospel_narration,
            'has_mc_reader': self.has_mc_reader,
            'has_third_reading': self.has_third_reading,
            'has_apostles': self.has_apostles,
            'has_thanksgiving': self.has_thanksgiving,
            'has_carols': self.has_carols,
            'has_morning_adoration': self.has_morning_adoration,
            'has_departed_souls_reader': self.has_departed_souls_reader
        }

class Mass(db.Model):
    """A specific mass instance with date and time"""
    id = db.Column(db.Integer, primary_key=True)
    mass_type_id = db.Column(db.Integer, db.ForeignKey('mass_type.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.String(20))
    celebrant = db.Column(db.String(100))  # Priest name
    notes = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    assignments = db.relationship('MassAssignment', backref='mass', lazy='dynamic', cascade='all, delete-orphan')
    apostles = db.relationship('Apostle', backref='mass', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'mass_type': self.mass_type.to_dict() if self.mass_type else None,
            'date': self.date.strftime('%Y-%m-%d') if self.date else None,
            'time': self.time,
            'celebrant': self.celebrant,
            'notes': self.notes,
            'assignments': [a.to_dict() for a in self.assignments],
            'apostles': [a.to_dict() for a in self.apostles]
        }

class MassAssignment(db.Model):
    """Assignment of a member to a specific reading role in a mass"""
    id = db.Column(db.Integer, primary_key=True)
    mass_id = db.Column(db.Integer, db.ForeignKey('mass.id'), nullable=False)
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'))
    role = db.Column(db.String(50), nullable=False)  # introduction, first_reading, etc.
    member_name_override = db.Column(db.String(100))  # For non-member participants
    notes = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'mass_id': self.mass_id,
            'member_id': self.member_id,
            'member_name': self.member.name if self.member else self.member_name_override,
            'role': self.role,
            'notes': self.notes
        }

class Apostle(db.Model):
    """For Maundy Thursday - 12 Apostles"""
    id = db.Column(db.Integer, primary_key=True)
    mass_id = db.Column(db.Integer, db.ForeignKey('mass.id'), nullable=False)
    apostle_name = db.Column(db.String(50), nullable=False)  # Peter, John, etc.
    member_id = db.Column(db.Integer, db.ForeignKey('member.id'))
    member_name_override = db.Column(db.String(100))
    
    member = db.relationship('Member', backref='apostle_assignments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'apostle_name': self.apostle_name,
            'member_name': self.member.name if self.member else self.member_name_override
        }

class DepartedSoul(db.Model):
    """For All Souls Day - list of departed souls to be read"""
    id = db.Column(db.Integer, primary_key=True)
    mass_id = db.Column(db.Integer, db.ForeignKey('mass.id'), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    family_name = db.Column(db.String(100))  # Family who requested
    
    mass = db.relationship('Mass', backref='departed_souls')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'family_name': self.family_name
        }

class MassChangeLog(db.Model):
    """Audit log for tracking all changes to mass records"""
    id = db.Column(db.Integer, primary_key=True)
    mass_id = db.Column(db.Integer, db.ForeignKey('mass.id'), nullable=False)
    changed_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    changed_by = db.Column(db.String(100))  # Username or system identifier
    change_reason = db.Column(db.Text, nullable=False)  # Mandatory reason for change
    
    # Store the changes as JSON
    field_changed = db.Column(db.String(50))  # e.g., 'mass_type', 'date', 'assignments'
    old_value = db.Column(db.Text)  # JSON string of old value
    new_value = db.Column(db.Text)  # JSON string of new value
    
    mass = db.relationship('Mass', backref='change_logs')
    
    def to_dict(self):
        return {
            'id': self.id,
            'mass_id': self.mass_id,
            'changed_at': self.changed_at.strftime('%Y-%m-%d %H:%M:%S'),
            'changed_by': self.changed_by,
            'change_reason': self.change_reason,
            'field_changed': self.field_changed,
            'old_value': self.old_value,
            'new_value': self.new_value
        }
