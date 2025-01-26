import * as yup from 'yup';
import i18next from 'i18next';
import axios from 'axios';
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

  const { state, renderForm } = render(elements, i18n, initialState);

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

  const fetchRSS = (url) => {
    state.loadingProcess.status = 'loading';
    return getAxiosResponse(url)
      .then((response) => {
        const { feedTitle, feedDescription, posts } = parseRSS(response.data.contents);

        state.feeds.push({
          id: Date.now(),
          title: feedTitle,
          description: feedDescription,
          url,
        });

        posts.forEach((post) => {
          state.posts.push({
            id: Date.now(),
            feedId: state.feeds[state.feeds.length - 1].id,
            ...post,
          });
        });

        state.loadingProcess.status = 'success';
        state.form.error = '';
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
          state.loadingProcess.error = 'errors.networkError';
        }
        throw err;
      });
  };

  elements.form.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(elements.form);
    const url = formData.get('url');

    validateForm(url, state.feeds.map((feed) => feed.url))
      .then(() => fetchRSS(url))
      .then(() => {
        elements.input.value = '';
        elements.input.focus();
        elements.feedback.textContent = i18n.t('loading.success');
        elements.feedback.classList.remove('text-danger');
        elements.feedback.classList.add('text-success');
      })
      .catch((err) => {
        elements.feedback.textContent = i18n.t(state.form.error || state.loadingProcess.error);
        elements.feedback.classList.remove('text-success');
        elements.feedback.classList.add('text-danger');
      });
  });

  renderForm();
};

export default app;
