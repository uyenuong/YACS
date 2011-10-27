from django.conf.urls.defaults import patterns, include, url
from yacs.scheduler import views

urlpatterns = patterns('',
    # selecting courses
    url(r'^(?P<year>[1-9]\d*)/(?P<month>[1-9]\d*)/schedules/$', views.force_compute_schedules, name='schedules'),
    url(r'^(?P<year>[1-9]\d*)/(?P<month>[1-9]\d*)/new-schedules/ajax/$', views.json_compute_schedules_via_cache, name='ajax-schedules'),
    url(r'^(?P<year>[1-9]\d*)/(?P<month>[1-9]\d*)/cached-schedules/$', views.compute_schedules_via_cache, name='schedules'),
    url(r'^(?P<year>[1-9]\d*)/(?P<month>[1-9]\d*)/new-schedules/$', views.schedules_bootloader, name='schedules'),

)
