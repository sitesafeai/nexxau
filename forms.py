from django import forms
from django.contrib.auth.forms import UserCreationForm
from django.contrib.auth.models import User
from .models import Client, Worksite, Camera, Worker, CameraSystemConfig

class ClientForm(forms.ModelForm):
    class Meta:
        model = Client
        fields = ['name', 'email', 'phone', 'address']
        widgets = {
            'address': forms.Textarea(attrs={'rows': 3}),
        }

class WorksiteForm(forms.ModelForm):
    class Meta:
        model = Worksite
        fields = ['name', 'address', 'camera_system_type']
        widgets = {
            'address': forms.Textarea(attrs={'rows': 3}),
        }

class MilestoneConfigForm(forms.ModelForm):
    class Meta:
        model = CameraSystemConfig
        fields = ['milestone_server', 'milestone_port']
        widgets = {
            'milestone_port': forms.NumberInput(attrs={'min': 1, 'max': 65535}),
        }

class CloudConfigForm(forms.ModelForm):
    class Meta:
        model = CameraSystemConfig
        fields = ['cloud_provider', 'cloud_region']

class RTSPConfigForm(forms.ModelForm):
    class Meta:
        model = Camera
        fields = ['name', 'ip_address', 'port', 'username', 'password']
        widgets = {
            'password': forms.PasswordInput(),
        }

class ONVIFConfigForm(forms.ModelForm):
    class Meta:
        model = Camera
        fields = ['name', 'ip_address', 'port', 'username', 'password']
        widgets = {
            'password': forms.PasswordInput(),
        }

class WorkerForm(forms.ModelForm):
    first_name = forms.CharField(max_length=30, required=True)
    last_name = forms.CharField(max_length=30, required=True)
    email = forms.EmailField(required=True)
    password = forms.CharField(widget=forms.PasswordInput())
    confirm_password = forms.CharField(widget=forms.PasswordInput())

    class Meta:
        model = Worker
        fields = ['role', 'phone', 'employee_id', 'worksites']
        widgets = {
            'worksites': forms.CheckboxSelectMultiple(),
        }

    def clean(self):
        cleaned_data = super().clean()
        password = cleaned_data.get('password')
        confirm_password = cleaned_data.get('confirm_password')

        if password and confirm_password and password != confirm_password:
            raise forms.ValidationError("Passwords don't match")

        return cleaned_data

    def save(self, commit=True):
        worker = super().save(commit=False)
        user = User.objects.create_user(
            username=self.cleaned_data['email'],
            email=self.cleaned_data['email'],
            password=self.cleaned_data['password'],
            first_name=self.cleaned_data['first_name'],
            last_name=self.cleaned_data['last_name']
        )
        worker.user = user
        if commit:
            worker.save()
        return worker 