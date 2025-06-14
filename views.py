from django.shortcuts import render, redirect
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.http import JsonResponse
from .models import Client, Worksite, Camera, Worker, CameraSystemConfig
from .forms import (
    ClientForm, WorksiteForm, MilestoneConfigForm, CloudConfigForm,
    RTSPConfigForm, ONVIFConfigForm, WorkerForm
)

@login_required
def onboarding_dashboard(request):
    return render(request, 'onboarding/dashboard.html')

@login_required
def client_onboarding(request):
    if request.method == 'POST':
        form = ClientForm(request.POST)
        if form.is_valid():
            client = form.save()
            return redirect('worksite_onboarding', client_id=client.id)
    else:
        form = ClientForm()
    return render(request, 'onboarding/client_form.html', {'form': form})

@login_required
def worksite_onboarding(request, client_id):
    client = Client.objects.get(id=client_id)
    if request.method == 'POST':
        form = WorksiteForm(request.POST)
        if form.is_valid():
            worksite = form.save(commit=False)
            worksite.client = client
            worksite.save()
            
            # Redirect to appropriate camera configuration based on system type
            if worksite.camera_system_type == 'MILESTONE':
                return redirect('milestone_config', worksite_id=worksite.id)
            elif worksite.camera_system_type == 'CLOUD':
                return redirect('cloud_config', worksite_id=worksite.id)
            elif worksite.camera_system_type == 'RTSP':
                return redirect('rtsp_config', worksite_id=worksite.id)
            elif worksite.camera_system_type == 'ONVIF':
                return redirect('onvif_config', worksite_id=worksite.id)
    else:
        form = WorksiteForm()
    return render(request, 'onboarding/worksite_form.html', {'form': form, 'client': client})

@login_required
def milestone_config(request, worksite_id):
    worksite = Worksite.objects.get(id=worksite_id)
    if request.method == 'POST':
        form = MilestoneConfigForm(request.POST)
        if form.is_valid():
            config = form.save(commit=False)
            config.worksite = worksite
            config.save()
            return redirect('camera_list', worksite_id=worksite.id)
    else:
        form = MilestoneConfigForm()
    return render(request, 'onboarding/milestone_config.html', {'form': form, 'worksite': worksite})

@login_required
def cloud_config(request, worksite_id):
    worksite = Worksite.objects.get(id=worksite_id)
    if request.method == 'POST':
        form = CloudConfigForm(request.POST)
        if form.is_valid():
            config = form.save(commit=False)
            config.worksite = worksite
            config.save()
            return redirect('camera_list', worksite_id=worksite.id)
    else:
        form = CloudConfigForm()
    return render(request, 'onboarding/cloud_config.html', {'form': form, 'worksite': worksite})

@login_required
def rtsp_config(request, worksite_id):
    worksite = Worksite.objects.get(id=worksite_id)
    if request.method == 'POST':
        form = RTSPConfigForm(request.POST)
        if form.is_valid():
            camera = form.save(commit=False)
            camera.worksite = worksite
            camera.save()
            return redirect('camera_list', worksite_id=worksite.id)
    else:
        form = RTSPConfigForm()
    return render(request, 'onboarding/rtsp_config.html', {'form': form, 'worksite': worksite})

@login_required
def onvif_config(request, worksite_id):
    worksite = Worksite.objects.get(id=worksite_id)
    if request.method == 'POST':
        form = ONVIFConfigForm(request.POST)
        if form.is_valid():
            camera = form.save(commit=False)
            camera.worksite = worksite
            camera.save()
            return redirect('camera_list', worksite_id=worksite.id)
    else:
        form = ONVIFConfigForm()
    return render(request, 'onboarding/onvif_config.html', {'form': form, 'worksite': worksite})

@login_required
def camera_list(request, worksite_id):
    worksite = Worksite.objects.get(id=worksite_id)
    cameras = Camera.objects.filter(worksite=worksite)
    return render(request, 'onboarding/camera_list.html', {
        'worksite': worksite,
        'cameras': cameras
    })

@login_required
def worker_onboarding(request, client_id):
    client = Client.objects.get(id=client_id)
    if request.method == 'POST':
        form = WorkerForm(request.POST)
        if form.is_valid():
            worker = form.save(commit=False)
            worker.client = client
            worker.save()
            form.save_m2m()  # Save many-to-many relationships
            messages.success(request, 'Worker added successfully!')
            return redirect('worker_list', client_id=client.id)
    else:
        form = WorkerForm()
    return render(request, 'onboarding/worker_form.html', {'form': form, 'client': client})

@login_required
def worker_list(request, client_id):
    client = Client.objects.get(id=client_id)
    workers = Worker.objects.filter(client=client)
    return render(request, 'onboarding/worker_list.html', {
        'client': client,
        'workers': workers
    })

@login_required
def test_camera_connection(request):
    if request.method == 'POST':
        camera_type = request.POST.get('camera_type')
        config_data = request.POST.dict()
        
        # Test connection based on camera type
        if camera_type == 'MILESTONE':
            # Test Milestone XProtect connection
            success = test_milestone_connection(config_data)
        elif camera_type == 'CLOUD':
            # Test cloud connection
            success = test_cloud_connection(config_data)
        elif camera_type in ['RTSP', 'ONVIF']:
            # Test RTSP/ONVIF connection
            success = test_rtsp_connection(config_data)
        
        return JsonResponse({'success': success})
    return JsonResponse({'error': 'Invalid request method'}) 