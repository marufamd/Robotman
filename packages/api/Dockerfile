FROM ruby:3.2.2-slim

WORKDIR /app/packages/api

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential libpq-dev \
  && rm -rf /var/lib/apt/lists/*

COPY packages/api/Gemfile ./Gemfile
RUN bundle install

COPY packages/api .

ENV RAILS_ENV=development
ENV RACK_ENV=development

EXPOSE 3001

CMD ["bundle", "exec", "ruby", "bin/rails", "server", "-b", "0.0.0.0", "-p", "3001"]
