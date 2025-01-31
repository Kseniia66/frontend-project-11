import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
import { uniqueId } from 'lodash';
import render from './view.js';
import ru from './ru.js';
import parseRSS from './parser.js';

const getAxiosResponse = (link) => {
  const url = `https://allorigins.hexlet.app/get?disableCache=true&url=${encodeURIComponent(link)}`;
  return axios.get(url);
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
  });

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

  const { state } = render(elements, i18n, initialState);

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
  const validateForm = (url, addedUrls) => schema(addedUrls)
    .validate({ url }, { abortEarly: false })
    .then(() => {
      state.form.isValid = true;
      state.form.error = '';
    })
    .catch((err) => {
      const [firstError] = err.errors;
      state.form.isValid = false;
      state.form.error = firstError;
      throw err;
    });

  const checkForNewPosts = () => {
    const existingTitles = new Set(state.posts.map((post) => post.title));
    const existingLinks = new Set(state.posts.map((post) => post.link));

    const feedPromises = state.feeds.map((feed) => getAxiosResponse(feed.url)
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
          (post) => !state.posts.some((existingPost) => existingPost.link === post.link),
        );
        if (uniqueNewPosts.length > 0) {
          state.posts = [...uniqueNewPosts, ...state.posts];
          render(elements, i18n, state);
        }
      })
      .catch((error) => {
        console.error('Ошибка при проверке новых постов:', error);
      })
      .finally(() => {
        setTimeout(checkForNewPosts, 5000);
      });
  };
  const fetchRSS = (url) => {
    state.loadingProcess.status = 'loading';
    return getAxiosResponse(url)
      .then((response) => {
        const parsedData = parseRSS(response.data.contents);
        if (!parsedData) {
          throw new Error('errors.invalidRSS');
        }
        const { feedTitle, feedDescription, posts } = parsedData;

        const feedId = uniqueId();
        state.feeds.push({
          id: feedId,
          title: feedTitle,
          description: feedDescription,
          url,
        });

        const existingLinks = new Set(state.posts.map((post) => post.link));
        const newPosts = posts
          .filter((post) => !existingLinks.has(post.link))
          .map((post) => ({
            id: uniqueId(),
            feedId,
            ...post,
          }));

        state.posts = [...newPosts, ...state.posts];
        state.loadingProcess.status = 'success';
        state.form.error = '';
        checkForNewPosts();
      })
      .catch((err) => {
        if (err.message === 'Network Error') {
          state.loadingProcess.status = 'fail';
          state.loadingProcess.error = 'errors.networkError';
        } else if (err.message === 'errors.invalidRSS') {
          state.loadingProcess.status = 'fail';
          state.loadingProcess.error = 'errors.invalidRSS';
        } else {
          state.loadingProcess.status = 'fail';
          state.loadingProcess.error = 'errors.unknown';
        }
        throw err;
      });
  };

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    const url = elements.input.value;
    const addedUrls = state.feeds.map((feed) => feed.url);

    validateForm(url, addedUrls)
      .then(() => fetchRSS(url))
      .catch((err) => {
        console.error(err);
        state.loadingProcess.error = state.form.error;
      })
      .finally(() => {
        render(elements, i18n, state);
      });
  });

  setTimeout(checkForNewPosts, 5000);
};

export default app;
