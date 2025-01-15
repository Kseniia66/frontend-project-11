import onChange from 'on-change';
import * as yup from 'yup';

const initialState = {
  status: '',
  value: '',
  isValid: true,
  posts: [],
  feeds: [],
};
const schema = (addedUrls) => yup.object({
  url: yup
    .string()
    .url('Ссылка должна быть валидным URL')
    .required('Поле не должно быть пустым')
    .notOneOf(addedUrls, 'RSS-лента уже добавлена'),
});

const app = () => {
  const input = document.querySelector('#url-input');
  const button = document.querySelector('button[type="submit"]');
  const form = document.querySelector('.rss-form');

  const watchedState = onChange(initialState, (path, value) => {
    if (path === 'isValid') {
      input.classList.toggle('is-invalid', !value);
    }
    if (path === 'status') {
      // Блокировка формы на время загрузки
      input.disabled = value === 'loading';
      button.disabled = value === 'loading';
    }
    if (path === 'feeds') {
      // Очистка формы после успешного добавления
      if (value.length > initialState.feeds.length) {
        input.value = '';
        input.focus();
      }
    }
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const url = input.value.trim();

    // Валидация с использованием промисов
    schema(watchedState.feeds)
      .validate({ url }, { abortEarly: false })
      .then(() => {
        // Успешная валидация
        watchedState.isValid = true;
        watchedState.status = 'valid';
      })
      .catch((err) => {
        // Ошибка валидации
        watchedState.isValid = false;
        watchedState.status = 'invalid';
        console.error(err.errors.join(', ')); // Выводим сообщения об ошибках
      });
  });
  input.addEventListener('input', () => {
    input.style.border = ''; // Убираем красную рамку
  });
};

export default app;
