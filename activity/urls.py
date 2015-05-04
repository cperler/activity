from django.conf.urls import patterns, url

from activity.views import index, TwitterTweets, TwitterSearch


urlpatterns = patterns('',
    url(r'^$', index, name='index'),
    url(r'twitter/search/(?P<query>.+)$', TwitterSearch.as_view(), name='twitter_search'),
    url(r'twitter/tweets/(?P<query>.+)$', TwitterTweets.as_view(), name='twitter_tweets')
)
