from django.conf.urls.defaults import patterns, include, url
from django.contrib import admin
admin.autodiscover()
from django.conf import settings

from courses.sitemaps import sitemaps

urlpatterns = patterns('',
    url(r'^robots\.txt$', include('robots.urls'), name='robots'),
    url(r'^sitemap\.xml$', 'django.contrib.sitemaps.views.sitemap', {'sitemaps': sitemaps}, name='sitemap'),

    url(r'^', include('courses.urls')),
    url(r'^', include('scheduler.urls')),
    url(r'^api/', include('api.urls', namespace='api')),
    #url(r'^api/', include('api.urls', namespace='api')),
    # Examples:
    # url(r'^$', 'views.home', name='home'),
    # url(r'^timetable/', include('foo.urls')),

    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),
    url(r'^admin/', include(admin.site.urls)),
)

if settings.DEBUG:
    urlpatterns += patterns('',
        url(r'^tests/', include('django_jasmine.urls')),
    )