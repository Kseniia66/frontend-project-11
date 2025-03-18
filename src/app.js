/* eslint-disable no-param-reassign */

import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import { uniqueId } from 'lodash';
import render from './view.js';
import resources from './locales/index.js';
import parseRSS from './parser.js';

const addProxy = (link) => {
  const proxyUrl = new URL('https://allorigins.hexlet.app/get');
  proxyUrl.searchParams.set('disableCache', 'true');
  proxyUrl.searchParams.set('url', link);
  return proxyUrl.toString();
};

const checkForNewPosts = (state) => {
  const existingTitles = new Set(state.posts.map((post) => post.title));
  const existingLinks = new Set(state.posts.map((post) => post.link));

  const feedPromises = state.feeds.map((feed) => axios.get(addProxy(feed.url))
    .then((response) => {
      const parsedData = parseRSS(response.data.contents);
      const newPosts = parsedData.posts
        .filter((post) => !existingLinks.has(post.link) && !existingTitles.has(post.title))
        .map((post) => ({
          ...post,
          id: uniqueId(),
          feedId: feed.id,
        }));

      if (newPosts.length > 0) {
        state.posts = [...newPosts, ...state.posts];
      }
    })
    .catch((error) => {
      console.error('Ошибка при проверке фида:', feed.url, error.message);
    }));

  Promise.all(feedPromises)
    .finally(() => {
      setTimeout(() => checkForNewPosts(state), 5000);
    });
};

const fetchRSS = (url, state) => {
  state.loadingProcess.status = 'loading';

  return axios.get(addProxy(url))
    .then((response) => {
      const parsedData = parseRSS(response.data.contents);
      const { feedTitle, feedDescription, posts } = parsedData;
      const feedId = uniqueId();
      state.feeds.push({
        id: feedId,
        title: feedTitle,
        description: feedDescription,
        url,
      });

      const newPosts = posts
        .map((post) => ({
          id: uniqueId(),
          feedId,
          ...post,
        }));

      state.posts = [...newPosts, ...state.posts];
      state.loadingProcess.status = 'success';
      state.form.error = '';
    })
    .catch((err) => {
      if (err.isAxiosError) {
        state.loadingProcess.status = 'fail';
        state.loadingProcess.error = 'errors.networkError';
      } else if (err.isParsingError) {
        state.loadingProcess.status = 'fail';
        state.loadingProcess.error = 'errors.invalidRSS';
      } else {
        state.loadingProcess.status = 'fail';
        state.loadingProcess.error = 'errors.unknown';
      }
    });
};

const app = () => {
  const elements = {
    form: document.querySelector('.rss-form'),
    input: document.querySelector('#url-input'),
    submitButton: document.querySelector('button[type="submit"]'),
    feedback: document.querySelector('.feedback'),
    rssFeeds: document.querySelector('.feeds'),
    rssPosts: document.querySelector('.posts'),
    modal: document.querySelector('#modal'),
  };

  const i18n = i18next.createInstance();
  i18n.init({
    lng: 'ru',
    debug: false,
    resources,
  }).then(() => {
    const state = {
      form: {
        isValid: true,
        error: '',
      },
      loadingProcess: {
        status: 'idle', // 'loading', 'success', 'fail'
        error: '',
      },
      uiState: {
        viewedPosts: new Set(),
      },
      posts: [],
      feeds: [],
    };

    yup.setLocale({
      string: {
        url: () => ({ key: 'errors.invalidUrl' }),
      },
      mixed: {
        notOneOf: () => ({ key: 'errors.alreadyExists' }),
      },
    });

    const validateForm = (url, addedUrls) => {
      const schema = yup.object({
        url: yup
          .string()
          .url()
          .required()
          .notOneOf(addedUrls),
      });
      return schema.validate({ url });
    };

    const watchedState = render(elements, i18n, state);

    elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const url = elements.input.value;
      const addedUrls = watchedState.feeds.map((feed) => feed.url);

      validateForm(url, addedUrls)
        .then(() => {
          watchedState.form.isValid = true;
          watchedState.form.error = '';
          fetchRSS(url, watchedState);
        })
        .catch((error) => {
          console.error('Ошибка валидации:', error);
          watchedState.form.isValid = false;
          watchedState.form.error = error.message;
        });
    });

    elements.rssPosts.addEventListener('click', (event) => {
      const { target } = event;
      const postId = target.dataset.id;
      if (!postId) return;
      watchedState.uiState.viewedPosts.add(postId);
    });

    setTimeout(() => checkForNewPosts(watchedState), 5000);
  });
};
export default app;
