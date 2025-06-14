from django.db import models
from django.contrib.auth.models import User
from django.core.validators import EmailValidator

class Client(models.Model):
    name = models.CharField(max_length=200)
    email = models.EmailField(validators=[EmailValidator()])
    phone = models.CharField(max_length=20)
    address = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class Worksite(models.Model):
    CAMERA_SYSTEM_CHOICES = [
        ('MILESTONE', 'Milestone XProtect'),
        ('CLOUD', 'Cloud-based System'),
        ('RTSP', 'Direct RTSP'),
        ('ONVIF', 'ONVIF Protocol'),
        ('CUSTOM', 'Custom Integration')
    ]

    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='worksites')
    name = models.CharField(max_length=200)
    address = models.TextField()
    camera_system_type = models.CharField(max_length=20, choices=CAMERA_SYSTEM_CHOICES)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    api_url = models.URLField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.client.name} - {self.name}"

class Camera(models.Model):
    worksite = models.ForeignKey(Worksite, on_delete=models.CASCADE, related_name='cameras')
    name = models.CharField(max_length=200)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    port = models.IntegerField(blank=True, null=True)
    username = models.CharField(max_length=100, blank=True, null=True)
    password = models.CharField(max_length=100, blank=True, null=True)
    stream_url = models.URLField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.worksite.name} - {self.name}"

class Worker(models.Model):
    ROLE_CHOICES = [
        ('ADMIN', 'Administrator'),
        ('SUPERVISOR', 'Supervisor'),
        ('WORKER', 'Worker'),
        ('VIEWER', 'Viewer')
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='workers')
    worksites = models.ManyToManyField(Worksite, related_name='workers')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    phone = models.CharField(max_length=20)
    employee_id = models.CharField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.get_full_name()} - {self.role}"

class CameraSystemConfig(models.Model):
    worksite = models.OneToOneField(Worksite, on_delete=models.CASCADE, related_name='camera_config')
    milestone_server = models.CharField(max_length=255, blank=True, null=True)
    milestone_port = models.IntegerField(blank=True, null=True)
    cloud_provider = models.CharField(max_length=100, blank=True, null=True)
    cloud_region = models.CharField(max_length=100, blank=True, null=True)
    custom_config = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Camera Config for {self.worksite.name}" 