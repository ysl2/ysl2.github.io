/* global hexo */

'use strict';

const path = require('path');

// Add comment
hexo.extend.filter.register('theme_inject', injects => {
  const config = hexo.theme.config.disqus;
  if (!config.enable || !config.shortname || !config.apikey) return;

  injects.comment.raw('disqusjs', `
  <div class="comments">
    <div id="disqus_thread">
      <noscript>Please enable JavaScript to view the comments powered by Disqus.</noscript>
    </div>
  </div>
  `, {}, {cache: true});

  injects.bodyEnd.file('disqusjs', path.join(hexo.theme_dir, 'layout/_third-party/comments/disqusjs.njk'));

});
