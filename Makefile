.PHONY: dev build test clean install

install:
	npm ci

dev:
	npm run dev

build:
	npm run build

test:
	npm run test:run


clean:
	rm -rf node_modules dist .next .turbo
