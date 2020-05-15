"use strict";

const _ = require("lodash");

function sendUsersListWithPagination({ usersStore }) {
	return (request, response) => {
		const search = request.query.search;
		const pageSize = request.query.page_size;
		const page = request.query.page;

		const iteratees = [ "name" ];
		const orders = [ "asc" ];

		const users = _.orderBy(usersStore.search({ search }), iteratees, orders);
		const begin = pageSize * (page - 1);
		const end = begin + pageSize;

		response.status(200).json({
			page: page,
			page_size: pageSize,
			total_pages: Math.ceil(users.length / pageSize),
			total_users: users.length,
			users: _.slice(users, begin, end),
		});
	};
}

module.exports = {
	sendUsersListWithPagination,
};
