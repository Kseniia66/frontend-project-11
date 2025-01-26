import onChange from 'on-change';

const renderForm = (elements, i18n, state) => {
  const { input, feedback } = elements;

  if (state.loadingProcess.status === 'success') {
    input.value = '';
    input.focus();
  }

  if (state.form.error) {
    input.classList.add('is-invalid');
    feedback.textContent = i18n.t(state.form.error);
    feedback.classList.add('text-danger');
    feedback.classList.remove('text-success');
  } else if (state.loadingProcess.status === 'success') {
    input.classList.remove('is-invalid');
    feedback.textContent = i18n.t('loading.success');
    feedback.classList.remove('text-danger');
    feedback.classList.add('text-success');
  } else {
    input.classList.remove('is-invalid');
    feedback.textContent = '';
    feedback.classList.remove('text-danger', 'text-success');
  }
};

const renderFeeds = (elements, i18n, state) => {
  const { rssFeeds } = elements;

  if (state.loadingProcess.error === 'errors.networkError') {
    return;
  }

  if (!state.form.isValid && state.form.error !== 'errors.alreadyExists') {
    return;
  }

  rssFeeds.innerHTML = '';

  const divCards = document.createElement('div');
  divCards.classList.add('card', 'border-0');

  const div = document.createElement('div');
  div.classList.add('card-body');

  const feedsTitle = document.createElement('h2');
  feedsTitle.textContent = i18n.t('feeds');
  feedsTitle.classList.add('card-title', 'h4');
  div.append(feedsTitle);
  divCards.append(div);
  rssFeeds.append(divCards);

  state.feeds.forEach((feed) => {
    const feedElement = document.createElement('ul');
    feedElement.classList.add('list-group', 'border-0', 'rounded-0');

    const cardBody = document.createElement('li');
    cardBody.classList.add('list-group-item', 'border-0', 'border-end-0');

    const title = document.createElement('h3');
    title.classList.add('h6', 'm-0');
    title.textContent = feed.title;

    const description = document.createElement('p');
    description.classList.add('m-0', 'small', 'text-black-50');

    description.classList.add('card-text');
    description.textContent = feed.description;

    cardBody.append(title, description);
    feedElement.append(cardBody);
    rssFeeds.append(feedElement);
  });
};

const renderPosts = (elements, i18n, state) => {
  const { rssPosts } = elements;

  if (state.loadingProcess.error === 'errors.networkError') {
    return;
  }

  if (!state.form.isValid && state.form.error !== 'errors.alreadyExists') {
    return;
  }

  rssPosts.innerHTML = '';

  const divCards = document.createElement('div');
  divCards.classList.add('card', 'border-0');

  const div = document.createElement('div');
  div.classList.add('card-body');

  const postsTitle = document.createElement('h2');
  postsTitle.textContent = i18n.t('posts');
  postsTitle.classList.add('card-title', 'h4');
  div.append(postsTitle);
  divCards.append(div);
  rssPosts.append(divCards);

  state.posts.forEach((post) => {
    const postElement = document.createElement('ul');
    postElement.classList.add('list-group', 'border-0', 'rounded-0');

    const cardBody = document.createElement('li');
    cardBody.classList.add('list-group-item', 'd-flex', 'justify-content-between', 'align-items-start', 'border-0', 'border-end-0');

    const title = document.createElement('a');
    title.classList.add('fw-bold');
    title.href = post.link;
    title.target = '_blank';
    title.textContent = post.title;

    const button = document.createElement('button');
    button.setAttribute('type', 'button');
    button.classList.add('btn', 'btn-outline-primary', 'btn-sm');
    // button.dataset.id = id;
    button.dataset.bsToggle = 'modal';
    button.dataset.bsTarget = '#modal';
    button.textContent = i18n.t('preview');

    cardBody.append(title, button);
    postElement.append(cardBody);
    rssPosts.append(postElement);
  });
};

export default (elements, i18n, initialState) => {
  const state = onChange(initialState, () => {
    renderForm(elements, i18n, state);
    renderFeeds(elements, i18n, state);
    renderPosts(elements, i18n, state);
  });

  return {
    state,
    renderForm: () => renderForm(elements, i18n, state),
    renderFeeds: () => renderFeeds(elements, i18n, state),
    renderPosts: () => renderPosts(elements, i18n, state),
  };
};
