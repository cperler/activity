import json
from urllib import urlencode

from django.conf import settings
from django.shortcuts import render_to_response
from django.template.context import RequestContext
from django.utils.decorators import method_decorator
from django.views.generic.base import View

from activity import json_response
import oauth2 as oauth

providers = ['yahoo', 'angellist', 'github', 'twitter', 'crunchbase']
ibm = {'yahoo':'ibm', 'angellist':33218, 'github':'ibm', 'twitter':'ibm', 'crunchbase':'ibm'}

def index(request):
    identifiers = {provider:request.GET.get(provider, ibm[provider]) for provider in providers}
    return render_to_response('index.html', identifiers, RequestContext(request))

class Twitter(View):
    SEARCH_URL = 'https://api.twitter.com/1.1/search/tweets.json'
    TWEET_URL = 'https://api.twitter.com/1.1/statuses/user_timeline.json'
    
    def __init__(self, **kwargs):
        self.consumer = oauth.Consumer(getattr(settings, 'TWITTER_CONSUMER_KEY', None), 
                               getattr(settings, 'TWITTER_CONSUMER_SECRET', None))
        self.token = oauth.Token(getattr(settings, 'TWITTER_OAUTH_USER_TOKEN', None), 
                             getattr(settings, 'TWITTER_OAUTH_USER_SECRET', None))
        super(Twitter, self).__init__(**kwargs)

    def _get_url(self, query):
        raise Exception('Not implemented.')

    def get(self, request, query):
        url_with_data = self._get_url(query)
        client = oauth.Client(self.consumer, self.token)
        resp, content = client.request(url_with_data, 'GET')
        if resp['status'] != '200':
            raise Exception('Invalid response from Twitter: {}.'.format(content))
        if resp['status'] == '403':
            raise Exception('Unable to get data from Twitter: {}'.format(content))    
        return json.loads(content)
    
    @method_decorator(json_response)
    def dispatch(self, *args, **kwargs):
        return super(Twitter, self).dispatch(*args, **kwargs)

class TwitterSearch(Twitter):
    def _get_url(self, query):
        return Twitter.SEARCH_URL.replace(' ', '+').strip() + '?' + urlencode({'q':query})

class TwitterTweets(Twitter):
    def _get_url(self, query):
        return Twitter.TWEET_URL.replace(' ', '+').strip() + '?' + urlencode({'screen_name':query})