import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import { uniqueId } from 'lodash';
import render from './view.js';
import ru from './ru.js';
import parseRSS from './parser.js';

const initialState = {
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

const addProxy = (link) => {
  const proxyUrl = new URL('https://allorigins.hexlet.app/get');
  proxyUrl.searchParams.set('disableCache', 'true');
  proxyUrl.searchParams.set('url', link);
  return proxyUrl.toString();
};

const checkForNewPosts = (state, elements, i18n) => {
  const updatedState = { ...state };

  const existingTitles = new Set(updatedState.posts.map((post) => post.title));
  const existingLinks = new Set(updatedState.posts.map((post) => post.link));

  const feedPromises = state.feeds.map((feed) => axios.get(addProxy(feed.url))
    .then((response) => {
      const parsedData = parseRSS(response.data.contents);
      if (!parsedData) {
        throw new Error('errors.invalidRSS');
      }
      const newPosts = parsedData.posts
        .filter((post) => !existingLinks.has(post.link) && !existingTitles.has(post.title))
        .map((post) => ({
          ...post,
          id: uniqueId(),
          feedId: feed.id,
        }));

      return newPosts;
    })
    .catch((error) => {
      console.error('Ошибка при проверке фида:', feed.url, error.message);
      return [];
    }));

  Promise.all(feedPromises)
    .then((newPosts) => {
      const uniqueNewPosts = newPosts.flat().filter(
        (post) => !updatedState.posts.some((existingPost) => existingPost.link === post.link),
      );
      if (uniqueNewPosts.length > 0) {
        updatedState.posts = [...uniqueNewPosts, ...updatedState.posts];
        render(elements, i18n, updatedState);
      }
    })
    .catch((error) => {
      console.error('Ошибка при проверке новых постов:', error);
    })
    .finally(() => {
      setTimeout(() => checkForNewPosts(updatedState, elements, i18n), 5000);
    });
};

const fetchRSS = (url, state, elements, i18n) => {
  const updatedState = { ...state };
  updatedState.loadingProcess.status = 'loading';
  render(elements, i18n, updatedState);

  return axios.get(addProxy(url))
    .then((response) => {
      const parsedData = parseRSS(response.data.contents);
      if (!parsedData) {
        throw new Error('errors.invalidRSS');
      }
      const { feedTitle, feedDescription, posts } = parsedData;

      const feedId = uniqueId();
      updatedState.feeds.push({
        id: feedId,
        title: feedTitle,
        description: feedDescription,
        url,
      });

      const existingLinks = new Set(updatedState.posts.map((post) => post.link));
      const newPosts = posts
        .filter((post) => !existingLinks.has(post.link))
        .map((post) => ({
          id: uniqueId(),
          feedId,
          ...post,
        }));

      updatedState.posts = [...newPosts, ...state.posts];
      updatedState.loadingProcess.status = 'success';
      updatedState.form.error = '';
      render(elements, i18n, updatedState);
      checkForNewPosts(updatedState, elements, i18n);
    })
    .catch((err) => {
      if (err.message === 'Network Error') {
        updatedState.loadingProcess.status = 'fail';
        updatedState.loadingProcess.error = 'errors.networkError';
      } else if (err.message === 'errors.invalidRSS') {
        updatedState.loadingProcess.status = 'fail';
        updatedState.loadingProcess.error = 'errors.invalidRSS';
      } else {
        updatedState.loadingProcess.status = 'fail';
        updatedState.loadingProcess.error = 'errors.unknown';
      }
      render(elements, i18n, updatedState);
      throw err;
    });
};

const schema = (addedUrls) => yup.object({
  url: yup
    .string()
    .url('errors.invalidUrl')
    .required('errors.required')
    .notOneOf(addedUrls, 'errors.alreadyExists'),
});

yup.setLocale({
  string: {
    url: () => ({ key: 'errors.invalidUrl' }),
  },
  mixed: {
    notOneOf: () => ({ key: 'errors.alreadyExists' }),
  },
});

const validateForm = (url, addedUrls, state) => {
  const updatedState = { ...state };

  return schema(addedUrls)
    .validate({ url })
    .then(() => {
      updatedState.form.isValid = true;
      updatedState.form.error = '';
    })
    .catch((err) => {
      const [firstError] = err.errors;
      updatedState.form.isValid = false;
      updatedState.form.error = firstError;
      throw err;
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
    resources: { ru },
  }).then(() => {
    const { state } = { ...initialState };
    render(elements, i18n, state);

    elements.form.addEventListener('submit', (event) => {
      event.preventDefault();
      const url = elements.input.value;
      const addedUrls = state.feeds.map((feed) => feed.url);

      validateForm(url, addedUrls, state)
        .then(() => fetchRSS(url, state, elements, i18n))
        .catch((err) => {
          console.error(err);
          state.loadingProcess.error = state.form.error;
          render(elements, i18n, state);
        });
    });

    setTimeout(() => checkForNewPosts(state, elements, i18n), 5000);
  });
};
export default app;
