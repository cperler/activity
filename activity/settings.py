import os

from activity import passwords


BASE_DIR = os.path.dirname(os.path.dirname(__file__))


SECRET_KEY = passwords.SECRET_KEY

DEBUG = True

TEMPLATE_DEBUG = True

ALLOWED_HOSTS = []

# Twitter oauth details:
TWITTER_CONSUMER_KEY         = passwords.TWITTER_CONSUMER_KEY
TWITTER_CONSUMER_SECRET      = passwords.TWITTER_CONSUMER_SECRET
TWITTER_OAUTH_USER_TOKEN     = passwords.TWITTER_OAUTH_USER_TOKEN
TWITTER_OAUTH_USER_SECRET    = passwords.TWITTER_OAUTH_USER_SECRET

INSTALLED_APPS = (
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles'
)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.auth.middleware.SessionAuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

ROOT_URLCONF = 'activity.urls'

WSGI_APPLICATION = 'activity.wsgi.application'

TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
TEMPLATE_DIRS = (
    os.path.join(PROJECT_ROOT, 'templates'),
)


LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True


STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(PROJECT_ROOT, 'static')
STATICFILES_DIRS = (
    os.path.join(PROJECT_ROOT, 'client'),
)